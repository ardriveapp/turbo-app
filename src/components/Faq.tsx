import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFreeUploadLimit, formatFreeLimit } from '../hooks/useFreeUploadLimit';

const getFaqData = (freeLimit: number) => [
  {
    question: "How much storage do I need?",
    answer: "A little bit of money can go a long way in data storage. A small amount of USD can purchase storage for thousands of documents or hundreds of photos or songs. Files vary in size, but generally: 1 document ~0.31 MB, 1 HD Photo ~2.5 MB, 3.5 minute song ~3.5 MB, 1 minute HD video ~100 MB."
  },
  {
    question: "How are fees calculated?",
    answer: `The file size determines the fee to upload data to the network. The larger the file, the higher the price will be. ${freeLimit > 0 ? `Files under ${formatFreeLimit(freeLimit)} are FREE.` : ''} All file sizes are represented using binary units of measurement (i.e. 1 MB = 1024 KB).`
  },
  {
    question: "What are Credits?",
    answer: "Credits offer users the ability to pay via credit card instead of using AR tokens. Credits represent a 1:1 value with storage costs and are used solely to pay for uploads. Credits never expire once purchased."
  },
  {
    question: "How do I gift Credits?",
    answer: "You can gift credits by going to the Gift tab, entering an amount and recipient email address. The recipient will receive an email with a redemption code that they can use to add credits to their wallet."
  },
  {
    question: "Can I share Credits between wallets?",
    answer: "Yes! Use the Share tab to transfer credits to another wallet address. You can set an expiration time for the shared credits, and revoke access at any time."
  },
  {
    question: "What wallets are supported?",
    answer: "Ar.io supports Wander for Arweave wallets, MetaMask for Ethereum wallets, and Phantom for Solana wallets. You can connect any of these to manage your credits and uploads."
  },
  {
    question: "Is my data permanent?",
    answer: "Yes! All data uploaded through ar.io is permanently stored on the Arweave network. Once uploaded, your data cannot be deleted or modified, ensuring it remains accessible forever."
  },
  {
    question: "How fast are uploads?",
    answer: "Ar.io processes uploads at up to 860 transactions per second, making it one of the fastest ways to get data onto Arweave. Upload speeds depend on your internet connection and file sizes."
  }
];

export default function Faq() {
  const freeUploadLimitBytes = useFreeUploadLimit();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqData = getFaqData(freeUploadLimitBytes);

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-6">Frequently Asked Questions</h3>
      <div className="space-y-3">
        {faqData.map((item, index) => (
          <div 
            key={index}
            className="border border-border/20 rounded-2xl overflow-hidden"
          >
            <button
              onClick={() => toggleExpanded(index)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-card transition-colors"
            >
              <span className="font-medium">{item.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-foreground/80 transition-transform ${
                  expandedIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expandedIndex === index && (
              <div className="px-4 py-3 bg-card border-t border-border/20">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}