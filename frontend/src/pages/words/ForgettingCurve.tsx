import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PIMSLEUR_LEVEL_MAX, intervalMsForLevel } from "@vocab-bot/shared/pimsleurSchedule";
import {
  reviewRetentionThresholdForLevel,
  computeFullLadderTimeline,
  retentionAtElapsed,
  sampleFullLadderCurve,
  type FullLadderPoint,
} from "@vocab-bot/shared/forgettingCurve";
import { formatShortDurationMs } from "../../utils/convertTime";
import { joinClassNames } from "../../components/UI/joinClassNames";

type ForgettingCurveProps = {
  pimsleurLevel: number;
  nextReviewMs: number;
  nowMs?: number;
  compact?: boolean;
  /** 0–1 progress on the current segment; overrides timeline for marker and fill. */
  segmentProgressOverride?: number;
  /** Loop marker along the current segment decay curve. */
  animateMarker?: boolean;
  /** Wall-clock ms to traverse one full segment when animating (default 5s). */
  animationLoopMs?: number;
};

const BASE_WIDTH = 520;
const HEIGHT = 232;
const LOGO_MARKER_SIZE = 18;
const PAD = { top: 18, right: 16, bottom: 56, left: 44 };
const BASE_PLOT_W = BASE_WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const MIN_SEGMENT_LABEL_WIDTH = 24;
const DURATION_BADGE_HEIGHT = 18;
const DURATION_BADGE_PAD_X = 6;
const MIN_ZOOM = 1;
const MAX_ZOOM = 128;
const ZOOM_STEP = 2;
const DEFAULT_ANIMATION_LOOP_MS = 5000;
/** Each stage is twice as wide as the previous one on the chart (2^level). */
const TOTAL_STAGE_VISUAL_WEIGHT = 2 ** (PIMSLEUR_LEVEL_MAX + 1) - 1;

type StageXScale = {
  chartWidth: number;
  plotWidth: number;
  xAt: (segmentIndex: number, segmentProgress: number) => number;
  segmentStartX: (segmentIndex: number) => number;
  segmentWidth: (segmentIndex: number) => number;
};

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

function cumulativeStageVisualWeightBefore(level: number): number {
  let sum = 0;
  for (let i = 0; i < level; i += 1) {
    sum += 2 ** i;
  }
  return sum;
}

function stageVisualWeight(level: number): number {
  return 2 ** level;
}

function visualWeightForWindow(startLevel: number, endLevel: number): number {
  let sum = 0;
  for (let level = startLevel; level <= endLevel; level += 1) {
    sum += stageVisualWeight(level);
  }
  return sum;
}

function buildGeometricStageXScale(zoom: number): StageXScale {
  const plotWidth = BASE_PLOT_W * zoom;
  const chartWidth = PAD.left + plotWidth + PAD.right;

  return {
    chartWidth,
    plotWidth,
    xAt: (segmentIndex, segmentProgress) => {
      const start = (cumulativeStageVisualWeightBefore(segmentIndex) / TOTAL_STAGE_VISUAL_WEIGHT) * plotWidth;
      const width = (stageVisualWeight(segmentIndex) / TOTAL_STAGE_VISUAL_WEIGHT) * plotWidth;
      return PAD.left + start + segmentProgress * width;
    },
    segmentStartX: (segmentIndex) => {
      const start = (cumulativeStageVisualWeightBefore(segmentIndex) / TOTAL_STAGE_VISUAL_WEIGHT) * plotWidth;
      return PAD.left + start;
    },
    segmentWidth: (segmentIndex) =>
      (stageVisualWeight(segmentIndex) / TOTAL_STAGE_VISUAL_WEIGHT) * plotWidth,
  };
}

function computeZoomToFitStageNeighbors(centerLevel: number, viewportWidth: number): {
  zoom: number;
  windowStartLevel: number;
} {
  const windowStartLevel = Math.max(0, centerLevel - 1);
  const windowEndLevel = Math.min(PIMSLEUR_LEVEL_MAX, centerLevel + 1);
  const windowWeight = visualWeightForWindow(windowStartLevel, windowEndLevel);
  const zoom = clampZoom((viewportWidth * 0.98 * TOTAL_STAGE_VISUAL_WEIGHT) / (BASE_PLOT_W * windowWeight));
  return { zoom, windowStartLevel };
}

function applyStageNeighborFit(centerLevel: number, viewportWidth: number): {
  zoom: number;
  scrollLeft: number;
} {
  const { zoom, windowStartLevel } = computeZoomToFitStageNeighbors(centerLevel, viewportWidth);
  const scale = buildGeometricStageXScale(zoom);
  return {
    zoom,
    scrollLeft: scale.segmentStartX(windowStartLevel),
  };
}

function yAt(retention: number): number {
  return PAD.top + (1 - retention) * PLOT_H;
}

function formatRetentionPercent(retention: number): string {
  return `${Math.round(retention * 100)}%`;
}

function estimateDurationBadgeWidth(label: string): number {
  return label.length * 6.4 + DURATION_BADGE_PAD_X * 2;
}

function DurationBadge({ x, y, label }: { x: number; y: number; label: string }) {
  const badgeWidth = estimateDurationBadgeWidth(label);
  const badgeX = x - badgeWidth / 2;
  const badgeY = y - DURATION_BADGE_HEIGHT + 3;

  return (
    <g className="forgetting-curve__duration-badge">
      <rect
        className="forgetting-curve__duration-badge-bg"
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={DURATION_BADGE_HEIGHT}
        rx={5}
      />
      <text
        className="forgetting-curve__duration-badge-label"
        x={x}
        y={badgeY + DURATION_BADGE_HEIGHT / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}

function buildLinePath(points: FullLadderPoint[], xScale: StageXScale): string {
  return points
    .map((point, index) => {
      const cmd = index === 0 ? "M" : "L";
      return `${cmd} ${xScale.xAt(point.segmentIndex, point.segmentProgress).toFixed(2)} ${yAt(point.retention).toFixed(2)}`;
    })
    .join(" ");
}

function buildSegmentAreaPath(
  segmentIndex: number,
  segmentProgress: number,
  intervalMs: number,
  xScale: StageXScale,
): string {
  if (segmentProgress <= 0) {
    return "";
  }

  const steps = 12;
  const curvePoints: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= steps; i += 1) {
    const progress = (segmentProgress * i) / steps;
    const elapsedMs = progress * intervalMs;
    curvePoints.push({
      x: xScale.xAt(segmentIndex, progress),
      y: yAt(
        retentionAtElapsed(
          elapsedMs,
          intervalMs,
          reviewRetentionThresholdForLevel(segmentIndex),
        ),
      ),
    });
  }

  const startX = xScale.xAt(segmentIndex, 0);
  const endX = xScale.xAt(segmentIndex, segmentProgress);
  const baseY = yAt(0);
  const line = curvePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return `${line} L ${endX.toFixed(2)} ${baseY.toFixed(2)} L ${startX.toFixed(2)} ${baseY.toFixed(2)} Z`;
}

export default function ForgettingCurve({
  pimsleurLevel,
  nextReviewMs,
  nowMs = Date.now(),
  compact = false,
  segmentProgressOverride,
  animateMarker = false,
  animationLoopMs = DEFAULT_ANIMATION_LOOP_MS,
}: ForgettingCurveProps) {
  const { t } = useTranslation();
  const gradientId = useId().replace(/:/g, "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollRatioRef = useRef<number | null>(null);
  const pendingScrollLeftRef = useRef<number | null>(null);
  const initialFitDoneRef = useRef(false);
  const animationStartRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(compact ? 4 : MIN_ZOOM);
  const [containerWidth, setContainerWidth] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const safeLevel = Number.isFinite(pimsleurLevel)
    ? Math.max(0, Math.min(pimsleurLevel, PIMSLEUR_LEVEL_MAX))
    : 0;
  const safeNextReviewMs =
    Number.isFinite(nextReviewMs) && nextReviewMs > 0
      ? nextReviewMs
      : nowMs + intervalMsForLevel(safeLevel);

  const timeline = useMemo(
    () => computeFullLadderTimeline(safeLevel, safeNextReviewMs, nowMs),
    [safeLevel, safeNextReviewMs, nowMs],
  );

  const xScale = useMemo(() => buildGeometricStageXScale(zoom), [zoom]);

  const points = useMemo(
    () => sampleFullLadderCurve(timeline, 14, { projectCurrentSegment: compact }),
    [compact, timeline],
  );

  const pastAndCurrentPoints = points.filter((point) => point.phase !== "future");
  const futurePoints = points.filter((point) => point.phase === "future");

  const solidPath = buildLinePath(pastAndCurrentPoints, xScale);
  const futurePath = futurePoints.length > 0 ? buildLinePath(futurePoints, xScale) : "";

  const currentSegment = timeline.segments[timeline.pimsleurLevel];
  const markerProgress =
    segmentProgressOverride !== undefined
      ? Math.max(0, Math.min(1, segmentProgressOverride))
      : animateMarker
        ? animatedProgress
        : timeline.currentSegmentProgress;
  const markerRetention =
    currentSegment != null
      ? retentionAtElapsed(
          markerProgress * currentSegment.intervalMs,
          currentSegment.intervalMs,
          reviewRetentionThresholdForLevel(timeline.pimsleurLevel),
        )
      : timeline.retention;
  const nowX = xScale.xAt(timeline.pimsleurLevel, markerProgress);
  const nowY = yAt(markerRetention);

  useEffect(() => {
    if (!animateMarker || segmentProgressOverride !== undefined) {
      animationStartRef.current = null;
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    let frameId = 0;
    const loopMs = Math.max(500, animationLoopMs);

    const tick = (time: number) => {
      if (animationStartRef.current === null) {
        animationStartRef.current = time;
      }
      const elapsed = (time - animationStartRef.current) % loopMs;
      setAnimatedProgress(elapsed / loopMs);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
      animationStartRef.current = null;
    };
  }, [animateMarker, animationLoopMs, segmentProgressOverride, timeline.pimsleurLevel]);

  const changeZoom = useCallback(
    (nextZoom: number, anchorRatio?: number) => {
      const scrollEl = scrollRef.current;
      let ratio = anchorRatio;
      if (ratio === undefined && scrollEl && xScale.chartWidth > 0) {
        const focal = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
        ratio = focal / xScale.chartWidth;
      }
      pendingScrollRatioRef.current = ratio ?? 0.5;
      pendingScrollLeftRef.current = null;
      setZoom(clampZoom(nextZoom));
    },
    [xScale.chartWidth],
  );

  const fitCurrentStage = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) {
      return;
    }
    const { zoom: fitZoom, scrollLeft } = applyStageNeighborFit(
      timeline.pimsleurLevel,
      scrollEl.clientWidth,
    );
    pendingScrollLeftRef.current = scrollLeft;
    pendingScrollRatioRef.current = null;
    setZoom(fitZoom);
  }, [timeline.pimsleurLevel]);

  const resetZoom = useCallback(() => {
    changeZoom(MIN_ZOOM);
  }, [changeZoom]);

  useEffect(() => {
    if (!compact || !scrollRef.current) {
      return;
    }

    const element = scrollRef.current;
    const updateWidth = () => {
      const width = element.clientWidth;
      if (width > 0) {
        setContainerWidth(width);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [compact]);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) {
      return;
    }

    if (compact) {
      const viewportWidth = containerWidth > 0 ? containerWidth : scrollEl.clientWidth;
      if (viewportWidth <= 0) {
        return;
      }
      const { zoom: fitZoom, scrollLeft } = applyStageNeighborFit(
        timeline.pimsleurLevel,
        viewportWidth,
      );
      setZoom(fitZoom);
      scrollEl.scrollLeft = Math.max(0, scrollLeft);
      return;
    }

    if (!initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      const { zoom: fitZoom, scrollLeft } = applyStageNeighborFit(
        timeline.pimsleurLevel,
        scrollEl.clientWidth,
      );
      pendingScrollLeftRef.current = scrollLeft;
      setZoom(fitZoom);
      return;
    }

    if (pendingScrollLeftRef.current !== null) {
      scrollEl.scrollLeft = Math.max(0, pendingScrollLeftRef.current);
      pendingScrollLeftRef.current = null;
      return;
    }

    if (pendingScrollRatioRef.current !== null) {
      const ratio = pendingScrollRatioRef.current;
      pendingScrollRatioRef.current = null;
      scrollEl.scrollLeft = Math.max(0, ratio * xScale.chartWidth - scrollEl.clientWidth / 2);
      return;
    }
  }, [compact, containerWidth, timeline.pimsleurLevel, nextReviewMs, xScale.chartWidth, zoom]);

  useEffect(() => {
    if (compact) {
      return;
    }

    const scrollEl = scrollRef.current;
    if (!scrollEl) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const rect = scrollEl.getBoundingClientRect();
        const focalX = scrollEl.scrollLeft + (event.clientX - rect.left);
        const anchorRatio = xScale.chartWidth > 0 ? focalX / xScale.chartWidth : 0.5;
        const factor = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
        changeZoom(zoom * factor, anchorRatio);
        return;
      }

      const deltaX = event.deltaX;
      if (Math.abs(deltaX) <= 0) {
        return;
      }

      const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (maxScroll <= 0) {
        return;
      }

      const canScrollFurther =
        (deltaX > 0 && scrollEl.scrollLeft < maxScroll - 1) ||
        (deltaX < 0 && scrollEl.scrollLeft > 0);

      if (canScrollFurther) {
        event.preventDefault();
        event.stopPropagation();
        scrollEl.scrollLeft = Math.max(0, Math.min(maxScroll, scrollEl.scrollLeft + deltaX));
      }
    };

    scrollEl.addEventListener("wheel", onWheel, { passive: false });
    return () => scrollEl.removeEventListener("wheel", onWheel);
  }, [changeZoom, compact, xScale.chartWidth, zoom]);

  const yTicks = [1, 0.75, 0.5, 0.25, 0];
  const compactWindow = useMemo(() => {
    if (!compact) {
      return null;
    }
    const windowStartLevel = Math.max(0, timeline.pimsleurLevel - 1);
    const windowEndLevel = Math.min(PIMSLEUR_LEVEL_MAX, timeline.pimsleurLevel + 1);
    const xMin = Math.max(0, xScale.segmentStartX(windowStartLevel) - 6);
    const xMax = Math.min(
      xScale.chartWidth,
      xScale.xAt(windowEndLevel, 1) + PAD.right,
    );
    return {
      windowStartLevel,
      windowEndLevel,
      xMin,
      width: Math.max(1, xMax - xMin),
    };
  }, [compact, timeline.pimsleurLevel, xScale]);
  const levelTicks = compactWindow
    ? Array.from(
        { length: compactWindow.windowEndLevel - compactWindow.windowStartLevel + 1 },
        (_, index) => compactWindow.windowStartLevel + index,
      )
    : Array.from({ length: PIMSLEUR_LEVEL_MAX + 1 }, (_, level) => level);
  const chartViewBox = compactWindow
    ? `${compactWindow.xMin} 0 ${compactWindow.width} ${HEIGHT}`
    : `0 0 ${xScale.chartWidth} ${HEIGHT}`;

  return (
    <figure
      className={joinClassNames("forgetting-curve", compact && "forgetting-curve--compact")}
      aria-label={t("wordDetailPage.forgettingCurve.ariaLabel")}
    >
      {!compact ? (
        <div className="forgetting-curve__toolbar">
          <div className="forgetting-curve__zoom-controls">
            <button
              type="button"
              className="forgetting-curve__zoom-btn"
              onClick={() => changeZoom(zoom / ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              aria-label={t("wordDetailPage.forgettingCurve.zoomOut")}
            >
              −
            </button>
            <span className="forgetting-curve__zoom-label" title={t("wordDetailPage.forgettingCurve.zoomHint")}>
              ×{Math.round(zoom)}
            </span>
            <button
              type="button"
              className="forgetting-curve__zoom-btn"
              onClick={() => changeZoom(zoom * ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              aria-label={t("wordDetailPage.forgettingCurve.zoomIn")}
            >
              +
            </button>
          </div>
          <button type="button" className="forgetting-curve__tool-btn" onClick={fitCurrentStage}>
            {t("wordDetailPage.forgettingCurve.fitCurrent")}
          </button>
          <button
            type="button"
            className="forgetting-curve__tool-btn"
            onClick={resetZoom}
            disabled={zoom <= MIN_ZOOM}
          >
            {t("wordDetailPage.forgettingCurve.resetZoom")}
          </button>
        </div>
      ) : null}

      <div className="forgetting-curve__scroll" ref={scrollRef}>
        <svg
          className="forgetting-curve__chart"
          width={compact ? "100%" : xScale.chartWidth}
          height={HEIGHT}
          viewBox={chartViewBox}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--forgetting-curve-fill-top)" />
              <stop offset="100%" stopColor="var(--forgetting-curve-fill-bottom)" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                className="forgetting-curve__grid-line"
                x1={PAD.left}
                y1={yAt(tick)}
                x2={xScale.chartWidth - PAD.right}
                y2={yAt(tick)}
              />
              <text
                className="forgetting-curve__axis-label forgetting-curve__axis-label--y"
                x={PAD.left - 8}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatRetentionPercent(tick)}
              </text>
            </g>
          ))}

          {levelTicks.map((level) => (
            <g key={`level-${level}`}>
              <line
                className="forgetting-curve__stage-line"
                x1={xScale.segmentStartX(level)}
                y1={PAD.top}
                x2={xScale.segmentStartX(level)}
                y2={HEIGHT - PAD.bottom}
              />
              <text
                className="forgetting-curve__axis-label forgetting-curve__axis-label--x forgetting-curve__axis-label--stage"
                x={xScale.segmentStartX(level)}
                y={HEIGHT - 28}
                textAnchor="middle"
              >
                {level}
              </text>
            </g>
          ))}

          {timeline.segments.map((segment) => {
            if (
              compactWindow &&
              (segment.level < compactWindow.windowStartLevel ||
                segment.level > compactWindow.windowEndLevel)
            ) {
              return null;
            }
            const width = xScale.segmentWidth(segment.level);
            const label = formatShortDurationMs(segment.intervalMs);
            if (width < MIN_SEGMENT_LABEL_WIDTH || width < estimateDurationBadgeWidth(label)) {
              return null;
            }
            return (
              <DurationBadge
                key={`duration-${segment.level}`}
                x={xScale.xAt(segment.level, 0.5)}
                y={HEIGHT - 12}
                label={label}
              />
            );
          })}

          {!compact ? (
            <text
              className="forgetting-curve__axis-title forgetting-curve__axis-title--x"
              x={PAD.left + xScale.plotWidth / 2}
              y={HEIGHT - 2}
              textAnchor="middle"
            >
              {t("wordDetailPage.forgettingCurve.stageAxis")}
            </text>
          ) : null}

          <line
            className="forgetting-curve__axis"
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={HEIGHT - PAD.bottom}
          />
          <line
            className="forgetting-curve__axis"
            x1={PAD.left}
            y1={HEIGHT - PAD.bottom}
            x2={xScale.chartWidth - PAD.right}
            y2={HEIGHT - PAD.bottom}
          />

          {timeline.segments.map((segment, index) => {
            const phase =
              index < timeline.pimsleurLevel
                ? "past"
                : index > timeline.pimsleurLevel
                  ? "future"
                  : "current";
          const progress =
            phase === "past"
              ? 1
              : phase === "future"
                ? 0
                : compact && segmentProgressOverride === undefined && !animateMarker
                  ? 1
                  : phase === "current"
                    ? markerProgress
                    : timeline.currentSegmentProgress;
          if (phase === "future" || progress <= 0) {
            return null;
          }
          const areaPath = buildSegmentAreaPath(index, progress, segment.intervalMs, xScale);
            if (!areaPath) {
              return null;
            }
            return (
              <path
                key={`area-${segment.level}`}
                className="forgetting-curve__area forgetting-curve__area--segment"
                fill={`url(#${gradientId})`}
                d={areaPath}
              />
            );
          })}

          {timeline.segments.slice(0, timeline.pimsleurLevel).map((segment) => (
            <line
              key={`jump-${segment.level}`}
              className="forgetting-curve__review-jump"
              x1={xScale.xAt(segment.level, 1)}
              y1={yAt(reviewRetentionThresholdForLevel(segment.level))}
              x2={xScale.xAt(segment.level, 1)}
              y2={yAt(1)}
            />
          ))}

          {futurePath ? <path className="forgetting-curve__line forgetting-curve__line--future" d={futurePath} /> : null}
          <path className="forgetting-curve__line" d={solidPath} />

          <line
            className="forgetting-curve__now-line"
            x1={nowX}
            y1={PAD.top}
            x2={nowX}
            y2={HEIGHT - PAD.bottom}
          />

          <rect
            className="forgetting-curve__current-stage"
            x={xScale.segmentStartX(timeline.pimsleurLevel)}
            y={PAD.top}
            width={Math.max(xScale.segmentWidth(timeline.pimsleurLevel), 1)}
            height={PLOT_H}
            rx={4}
          />

          <image
            className={joinClassNames(
              "forgetting-curve__logo-marker",
              animateMarker && segmentProgressOverride === undefined && "forgetting-curve__logo-marker--animated",
            )}
            href="/landing/logo-icon.png"
            x={nowX - LOGO_MARKER_SIZE / 2}
            y={nowY - LOGO_MARKER_SIZE / 2}
            width={LOGO_MARKER_SIZE}
            height={LOGO_MARKER_SIZE}
          />
        </svg>
      </div>

      {!compact ? (
        <figcaption className="forgetting-curve__caption">
          <div className="forgetting-curve__legend">
            <span className="forgetting-curve__legend-item">
              <span
                className="forgetting-curve__legend-swatch forgetting-curve__legend-swatch--start"
                aria-hidden="true"
              />
              {t("wordDetailPage.forgettingCurve.lastReview")}
            </span>
            <span className="forgetting-curve__legend-item">
              <span
                className="forgetting-curve__legend-swatch forgetting-curve__legend-swatch--now"
                aria-hidden="true"
              />
              {t("wordDetailPage.forgettingCurve.now", {
                retention: formatRetentionPercent(
                  segmentProgressOverride !== undefined || animateMarker
                    ? markerRetention
                    : timeline.retention,
                ),
              })}
            </span>
            <span className="forgetting-curve__legend-item">
              <span
                className="forgetting-curve__legend-swatch forgetting-curve__legend-swatch--end"
                aria-hidden="true"
              />
              {t("wordDetailPage.forgettingCurve.nextReview")}
            </span>
            <span className="forgetting-curve__legend-item">
              <span
                className="forgetting-curve__legend-swatch forgetting-curve__legend-swatch--future"
                aria-hidden="true"
              />
              {t("wordDetailPage.forgettingCurve.futureStages")}
            </span>
          </div>
          {timeline.isOverdue ? (
            <p className="forgetting-curve__overdue">{t("wordDetailPage.forgettingCurve.overdue")}</p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
