import { useEffect, useState } from "react";

const NON_TEXT_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "file",
  "range",
  "color",
  "image",
]);

const isTextField = (el) =>
  !!el &&
  (el.tagName === "TEXTAREA" ||
    el.isContentEditable ||
    (el.tagName === "INPUT" && !NON_TEXT_INPUTS.has(el.type)));

// True while a text field has focus. Used to tuck the mobile bottom bar
// away so it doesn't ride up on top of the on-screen keyboard.
const useTextFieldFocus = () => {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const onIn = (e) => {
      if (isTextField(e.target)) setFocused(true);
    };
    const onOut = () => setFocused(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  return focused;
};

export default useTextFieldFocus;
