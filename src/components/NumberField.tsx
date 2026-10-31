"use client";
import { useId, useState, useContext, useEffect, type InputHTMLAttributes } from "react";
import {InputValidityContext} from "@/lib/input-validity";
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "min" | "max"
> & {
  value: number;
  min: number;
  max: number;
  integer?: boolean;
  onCommit: (n: number) => void;
};
export default function NumberField(props: Props) {
  return <Draft key={String(props.value)} {...props} />;
}
function Draft({ value, min, max, integer = false, onCommit, ...rest }: Props) {
  const [text, setText] = useState(String(value)),
    [error, setError] = useState(""),
    id = useId();
  const report=useContext(InputValidityContext);
  useEffect(()=>()=>report(id,false),[id,report]);
  function commit() {
    const n = text.trim() ? Number(text) : NaN;
    if (
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    ) {
      report(id,true);
      setError(
        `未应用此输入：须为${min}–${max}${integer ? "的整数" : ""}；仍按${value}计算。`,
      );
      return;
    }
    setError("");report(id,false);
    if (n !== value) onCommit(n);
  }
  return (
    <span className="draft-number">
      <input
        {...rest}
        type="number"
        min={min}
        max={max}
        step={integer ? 1 : "any"}
        value={text}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id : undefined}
        onChange={(e) => {
          setText(e.target.value);report(id,true);
          setError("");
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setText(String(value));report(id,false);
            setError("");
          }
        }}
      />
      {error && (
        <span role="status" id={id} className="input-error">
          {error}
        </span>
      )}
    </span>
  );
}
