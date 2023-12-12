import { JSX } from "react";
import * as React from "react";
import UpArrowIcon from "./icons/UpArrowIcon";
import "./Expandable.css";

interface ExpandableProps {
  question: string;
  answer: React.ReactNode;
  expanded: boolean;
  setExpanded: () => void;
}

export default function Expandable({
  question,
  answer,
  expanded,
  setExpanded,
}: ExpandableProps): JSX.Element {
  return (
    <div className={`expandable ${expanded ? "expanded" : ""}`}>
      <button aria-label={question} onClick={() => setExpanded()}>
        <h3>{question}</h3>
        <div className="expandable-icon-container">
          <UpArrowIcon />
        </div>
      </button>
      {expanded && <>{answer}</>}
    </div>
  );
}
