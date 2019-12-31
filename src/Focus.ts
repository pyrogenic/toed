import OpenIconicNames from "./OpenIconicNames";

enum Focus {
    hide = "hide",
    normal = "normal",
    focus = "focus",
}

export default Focus;

const FocusIcons = {
  [Focus.hide]: OpenIconicNames.code,
  [Focus.normal]: OpenIconicNames.eye,
  [Focus.focus]: OpenIconicNames.target,
};

export {FocusIcons};
