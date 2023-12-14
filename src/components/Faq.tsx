import { JSX, useState } from "react";
import Expandable from "./Expandable";
import { faqQuestionsAnswers } from "./Faq.content";
import "./Faq.css";

export default function Faq(): JSX.Element {
  const [expanded, setExpanded] = useState<number | undefined>(undefined);

  return (
    <section className="faq">
      <h2 aria-label="Frequently asked questions">FAQs</h2>
      {faqQuestionsAnswers.map((qa, index) => (
        <Expandable
          key={qa.question}
          question={qa.question}
          answer={qa.answer}
          expanded={index === expanded}
          setExpanded={() =>
            index === expanded ? setExpanded(undefined) : setExpanded(index)
          }
        ></Expandable>
      ))}
    </section>
  );
}
