import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ButtonHTMLAttributes, SVGProps } from "react";

import IconComponent, { type SvgIconComponent } from "../Icon";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon?: SvgIconComponent;
  faIcon?: IconDefinition;
  iconProps?: SVGProps<SVGSVGElement>;
  iconClassName?: string;
};

export default function IconButton({
  icon,
  faIcon,
  iconProps,
  iconClassName,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button type={type} {...rest}>
      <IconComponent
        icon={icon}
        faIcon={faIcon}
        iconProps={iconProps}
        iconClassName={iconClassName}
      />
    </button>
  );
}
