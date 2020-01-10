import React from "react";
export default function Maybe({ when, children }: React.PropsWithChildren<{
  when: any;
}>): JSX.Element | null {
  if (when === undefined || when === null || !when) {
    return null;
  }
  if (!children) {
    return null;
  }
  switch (typeof when) {
    case "object":
    case "string":
      if ("length" in when) {
        if (when.length === 0) {
          return null;
        }
      }
      break;
  }
  return <>{children}</>;
}
