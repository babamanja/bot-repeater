import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PIMSLEUR_LEVEL_MAX, intervalMsForLevel } from "@vocab-bot/shared/pimsleurSchedule";
import Button from "../../components/UI/Button/Button";
import Card from "../../components/UI/Card";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import { formatShortDurationMs } from "../../utils/convertTime";
import ForgettingCurve from "../words/ForgettingCurve";

import "../style.scss";

export default function AdminTestComponentsPage() {
  const { t } = useTranslation();
  const [level, setLevel] = useState(3);
  const [progressPercent, setProgressPercent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loopSeconds, setLoopSeconds] = useState(5);

  const progress = progressPercent / 100;
  const intervalMs = intervalMsForLevel(level);
  const baseNowMs = useMemo(() => Date.now(), [level]);
  const schedule = useMemo(
    () => ({
      pimsleurLevel: level,
      nextReviewMs: baseNowMs + intervalMs * (playing ? 1 : 1 - progress),
    }),
    [baseNowMs, intervalMs, level, playing, progress],
  );

  const handleProgressChange = (nextPercent: number) => {
    setPlaying(false);
    setProgressPercent(nextPercent);
  };

  return (
    <Page className="test-components">
      <PageHeader
        title={t("admin.testComponents.heading")}
        subtitle={t("admin.testComponents.intro")}
      />

      <Card className="test-components__panel">
        <h2 className="test-components__section-title">
          {t("admin.testComponents.forgettingCurveTitle")}
        </h2>

        <div className="test-components__controls">
          <label className="test-components__control">
            <span className="test-components__control-label">
              {t("admin.testComponents.level", { level, interval: formatShortDurationMs(intervalMs) })}
            </span>
            <input
              type="range"
              className="test-components__range"
              min={0}
              max={PIMSLEUR_LEVEL_MAX}
              step={1}
              value={level}
              onChange={(event) => {
                setPlaying(false);
                setLevel(Number(event.target.value));
              }}
            />
          </label>

          <label className="test-components__control">
            <span className="test-components__control-label">
              {t("admin.testComponents.progress", { percent: progressPercent })}
            </span>
            <input
              type="range"
              className="test-components__range"
              min={0}
              max={100}
              step={1}
              value={progressPercent}
              disabled={playing}
              onChange={(event) => handleProgressChange(Number(event.target.value))}
            />
          </label>

          <label className="test-components__control">
            <span className="test-components__control-label">
              {t("admin.testComponents.loopSeconds", { seconds: loopSeconds })}
            </span>
            <input
              type="range"
              className="test-components__range"
              min={2}
              max={20}
              step={1}
              value={loopSeconds}
              onChange={(event) => setLoopSeconds(Number(event.target.value))}
            />
          </label>

          <div className="test-components__actions">
            <Button type="button" onClick={() => setPlaying((value) => !value)}>
              {playing ? t("admin.testComponents.pause") : t("admin.testComponents.play")}
            </Button>
            <Button
              type="button"
              style="secondary"
              onClick={() => {
                setPlaying(false);
                setProgressPercent(0);
              }}
            >
              {t("admin.testComponents.reset")}
            </Button>
          </div>
        </div>

        <div className="test-components__preview">
          <ForgettingCurve
            pimsleurLevel={schedule.pimsleurLevel}
            nextReviewMs={schedule.nextReviewMs}
            segmentProgressOverride={playing ? undefined : progress}
            animateMarker={playing}
            animationLoopMs={loopSeconds * 1000}
          />
        </div>
      </Card>
    </Page>
  );
}
