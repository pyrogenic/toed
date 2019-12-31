import React from "react";
import OpenIconicNames, { iconClassName } from "./OpenIconicNames";

const Icon = React.memo(({icon}: {icon: OpenIconicNames}) => <span className={iconClassName(icon)} />);

export default Icon;
