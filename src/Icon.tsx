import React from "react";
import OpenIconicNames, { iconClassName } from "./OpenIconicNames";

const Icon = React.memo(
    (props: {
        icon: OpenIconicNames,
    } & React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) => {
        const { icon } = props;
        return <span className={iconClassName(icon)} {...props} />;
    });

export default Icon;
