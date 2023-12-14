import * as React from "react";
export const faqQuestionsAnswers: Array<{
  question: string;
  answer: React.JSX.Element;
}> = [
  {
    question: "How much storage do I need?",
    answer: (
      <>
        <p>
          A little bit of money can go a long way in data storage. As you can
          see, a small amount of USD can purchase storage for thousands of
          documents or hundreds of photos or songs.
        </p>
        <p>
          Files of the same type (docs, jpegs, or mp3) will vary in sizes, but
          in general: 1 document 0.31 MB (320KB); 1 HD Photo 2.5 MB; 3.5 minute
          Song 3.5 MB; 1 minute HD video 100 MB.
        </p>
      </>
    ),
  },
  {
    question: "How are fees calculated?",
    answer: (
      <>
        <p>
          The file size determines the fee to upload data to the network. The
          larger the file the higher the price will be.
        </p>
        <p>
          Note: All file sizes are represented using binary units of measurement
          (i.e. 1 MB = 1024 KB).
        </p>
      </>
    ),
  },

  {
    question: "What are Credits?",
    answer: (
      <>
        <p>
          Credits offers users the ability to pay via credit card instead of
          using the AR Token. Credits represent a 1:1 value with the AR Token,
          but are used solely to pay for uploads with ArDrive.
        </p>
        <p>
          <span>Learn more about </span>
          <a href="https://ardrive.io/turbo/infographic/">Credits</a>.
        </p>
      </>
    ),
  },
  {
    question: "Is the price of data consistent?",
    answer: (
      <>
        <p>
          Not exactly. The Arweave network protocol is always adjusting the data
          price to maintain sustainable, perpetual storage. The data price is
          lowered as the network increases its overall capacity.
        </p>
        <p>
          This can result in a fluctuating data price. However, for most files
          these fluctuations would only increase or decrease costs by fractions
          of a cent.
        </p>
      </>
    ),
  },
  {
    question: "How do I know how big a file is?",
    answer: (
      <p>
        In ArDrive, before any files are uploaded to the network, we calculate
        their size and estimate the price to upload. Before it is paid for and
        stored permanently, you must approve the upload. This ensures you are
        only uploading the right data for the right price.
      </p>
    ),
  },
  {
    question: "How do I use a credit card?",
    answer: (
      <p>
        You can purchase Credits with your credit card in the web app from the
        profile menu.
      </p>
    ),
  },
];
