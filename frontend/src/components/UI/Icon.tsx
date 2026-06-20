import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ComponentType, SVGProps } from "react";

export type SvgIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type IconProps = {
  icon?: SvgIconComponent;
  /** Font Awesome solid icon (e.g. `faCommentDots` from `@fortawesome/free-solid-svg-icons`). */
  faIcon?: IconDefinition;
  iconProps?: SVGProps<SVGSVGElement>;
  /** Applied to `FontAwesomeIcon` or merged with SVG `className`. */
  iconClassName?: string;
};

export default function IconComponent({ icon: Icon, faIcon, iconProps, iconClassName }: IconProps) {
  const svgClass = [iconProps?.className, iconClassName].filter(Boolean).join(" ") || undefined;
  return (
    <>
      {Icon ? <Icon aria-hidden {...iconProps} className={svgClass} /> : null}
      {faIcon ? <FontAwesomeIcon icon={faIcon} className={iconClassName} aria-hidden /> : null}
    </>
  );
}
