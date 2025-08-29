import { useState } from 'react';
import { ExternalLink, Code, Copy, Check } from 'lucide-react';

export default function DeveloperPanel() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'api' | 'guides'>('quickstart');

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeExamples = {
    install: `npm install @ardrive/turbo-sdk`,
    quickStart: `import { TurboFactory } from '@ardrive/turbo-sdk';

// Initialize Turbo client
const turbo = TurboFactory.authenticated({
  privateKey: process.env.PRIVATE_KEY,
});

// Upload a file
const uploadResult = await turbo.uploadFile({
  fileStreamFactory: () => fs.createReadStream('./my-file.pdf'),
  fileSizeFactory: () => fs.statSync('./my-file.pdf').size,
});

console.log('Upload ID:', uploadResult.id);`,

    topUp: `// Top up with fiat currency
const checkout = await turbo.createCheckoutSession({
  amount: 10.00, // USD
  currency: 'usd',
  email: 'user@example.com',
});

// Top up with crypto
const payment = await turbo.submitFundTransaction({
  txId: 'your-transaction-id',
});`,

    upload: `// Upload data directly
const dataItem = await turbo.uploadSignedDataItem({
  dataItemStreamFactory: () => fs.createReadStream('./data.json'),
  dataItemSizeFactory: () => fs.statSync('./data.json').size,
});

// Check upload status
const status = await turbo.getUploadStatus({ id: dataItem.id });
console.log('Status:', status);`,

    folder: `// Upload a folder
const folderUpload = await turbo.uploadFolder({
  folderPath: './my-folder',
  dataItemOpts: {
    tags: [
      { name: 'Content-Type', value: 'application/x-directory' },
      { name: 'App-Name', value: 'MyApp' }
    ]
  }
});

console.log('Folder manifest ID:', folderUpload.id);`,
  };

  return (
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Code className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Developer Resources</h3>
          <p className="text-sm text-link">
            Integrate Turbo into your applications with our SDK, APIs, and developer tools
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6 mb-6">

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-default">
        <button
          onClick={() => setActiveTab('quickstart')}
          className={`pb-2 px-1 transition-colors ${
            activeTab === 'quickstart' 
              ? 'text-fg-muted border-b-2 border-turbo-red' 
              : 'text-link hover:text-fg-muted'
          }`}
        >
          Quick Start
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`pb-2 px-1 transition-colors ${
            activeTab === 'api' 
              ? 'text-fg-muted border-b-2 border-turbo-red' 
              : 'text-link hover:text-fg-muted'
          }`}
        >
          API Endpoints
        </button>
        <button
          onClick={() => setActiveTab('guides')}
          className={`pb-2 px-1 transition-colors ${
            activeTab === 'guides' 
              ? 'text-fg-muted border-b-2 border-turbo-red' 
              : 'text-link hover:text-fg-muted'
          }`}
        >
          Guides
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'quickstart' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Installation</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.install, 'install')}
                className="text-link hover:text-turbo-red transition-colors p-1 rounded"
              >
                {copiedCode === 'install' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-canvas rounded-lg p-4 border border-default">
              <pre className="text-xs overflow-x-auto font-mono text-fg-muted">
                <code>{codeExamples.install}</code>
              </pre>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Basic Upload</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.quickStart, 'quickstart')}
                className="text-link hover:text-turbo-red transition-colors p-1 rounded"
              >
                {copiedCode === 'quickstart' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-canvas rounded-lg p-4 border border-default">
              <pre className="text-xs overflow-x-auto font-mono text-fg-muted">
                <code>{codeExamples.quickStart}</code>
              </pre>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Create Top-Up</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.topUp, 'topup')}
                className="text-link hover:text-turbo-red transition-colors p-1 rounded"
              >
                {copiedCode === 'topup' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-canvas rounded-lg p-4 border border-default">
              <pre className="text-xs overflow-x-auto font-mono text-fg-muted">
                <code>{codeExamples.topUp}</code>
              </pre>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Upload Folder</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.folder, 'folder')}
                className="text-link hover:text-turbo-red transition-colors p-1 rounded"
              >
                {copiedCode === 'folder' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-canvas rounded-lg p-4 border border-default">
              <pre className="text-xs overflow-x-auto font-mono text-fg-muted">
                <code>{codeExamples.folder}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-4">
          {/* Upload Service API */}
          <div className="bg-surface rounded-lg p-4 border border-default">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-fg-muted">Upload Service API</h5>
              <a href="https://upload.ardrive.io/api-docs" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-link hover:text-turbo-red transition-colors" />
              </a>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/20 text-turbo-red text-xs font-semibold rounded">POST</span>
                <code className="text-sm text-fg-muted">/tx</code>
                <span className="text-xs text-link">Upload signed data item</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/15 text-turbo-red text-xs font-semibold rounded">GET</span>
                <code className="text-sm text-fg-muted">/tx/:id/status</code>
                <span className="text-xs text-link">Check upload status</span>
              </div>
            </div>
          </div>

          {/* Payment Service API */}
          <div className="bg-surface rounded-lg p-4 border border-default">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-fg-muted">Payment Service API</h5>
              <a href="https://payment.ardrive.io/api-docs" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-link hover:text-turbo-red transition-colors" />
              </a>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/15 text-turbo-red text-xs font-semibold rounded">GET</span>
                <code className="text-sm text-fg-muted">/price/{"{currency}/{amount}"}</code>
                <span className="text-xs text-link">Get fiat conversion rates</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/20 text-turbo-red text-xs font-semibold rounded">POST</span>
                <code className="text-sm text-fg-muted">/top-up/payment-intent</code>
                <span className="text-xs text-link">Create payment session</span>
              </div>
            </div>
          </div>

          {/* Gateway Services API */}
          <div className="bg-surface rounded-lg p-4 border border-default">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-fg-muted">Gateway Services API</h5>
              <a href="https://vilenarios.com/api-docs" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-link hover:text-turbo-red transition-colors" />
              </a>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/15 text-turbo-red text-xs font-semibold rounded">GET</span>
                <code className="text-sm text-fg-muted">/{"{txId}"}</code>
                <span className="text-xs text-link">Retrieve data by transaction ID</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/20 text-turbo-red text-xs font-semibold rounded">POST</span>
                <code className="text-sm text-fg-muted">/tx</code>
                <span className="text-xs text-link">Submit transaction to network</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/15 text-turbo-red text-xs font-semibold rounded">GET</span>
                <code className="text-sm text-fg-muted">/ar-io/resolver/{"{name}"}</code>
                <span className="text-xs text-link">Resolve ArNS name</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-turbo-red/20 text-turbo-red text-xs font-semibold rounded">POST</span>
                <code className="text-sm text-fg-muted">/graphql</code>
                <span className="text-xs text-link">GraphQL query interface</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guides' && (
        <div className="grid md:grid-cols-2 gap-4">
          <a href="https://docs.ardrive.io/docs/turbo/turbo-sdk/" target="_blank" rel="noopener noreferrer"
             className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-turbo-red/50">
            <div className="text-xs text-link uppercase tracking-wider mb-2">SDK</div>
            <h5 className="font-bold mb-2 text-fg-muted">Turbo SDK (Node & Web)</h5>
            <p className="text-xs text-link">Install, quick start, events, CLI, and architecture.</p>
          </a>
          
          <a href="https://docs.ardrive.io/docs/turbo/turbo-sdk/frameworks/html.html" target="_blank" rel="noopener noreferrer"
             className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-turbo-red/50">
            <div className="text-xs text-link uppercase tracking-wider mb-2">GUIDE</div>
            <h5 className="font-bold mb-2 text-fg-muted">Use Turbo SDK in plain HTML</h5>
            <p className="text-xs text-link">Drop-in CDN import — no bundlers needed.</p>
          </a>
          
          <a href="https://docs.ar.io/guides/uploading-to-arweave" target="_blank" rel="noopener noreferrer"
             className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-turbo-red/50">
            <div className="text-xs text-link uppercase tracking-wider mb-2">UPLOAD</div>
            <h5 className="font-bold mb-2 text-fg-muted">Uploading to Arweave with Turbo</h5>
            <p className="text-xs text-link">AR.IO guide that walks through uploads with Turbo.</p>
          </a>
          
          <a href="https://cookbook.ar.io/guides/posting-transactions/turbo.html" target="_blank" rel="noopener noreferrer"
             className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-turbo-red/50">
            <div className="text-xs text-link uppercase tracking-wider mb-2">EXAMPLES</div>
            <h5 className="font-bold mb-2 text-fg-muted">Posting transactions via Turbo</h5>
            <p className="text-xs text-link">Code-first cookbook examples for data and files.</p>
          </a>
          
          <a href="https://docs.ardrive.io/docs/turbo/migrating.html" target="_blank" rel="noopener noreferrer"
             className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-turbo-red/50">
            <div className="text-xs text-link uppercase tracking-wider mb-2">MIGRATION</div>
            <h5 className="font-bold mb-2 text-fg-muted">Migrating from Irys</h5>
            <p className="text-xs text-link">Point your Irys SDK/CLI at Turbo with minimal changes.</p>
          </a>
          
          <a href="https://docs.ar.io/guides/permaweb-deploy" target="_blank" rel="noopener noreferrer"
             className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-turbo-red/50">
            <div className="text-xs text-link uppercase tracking-wider mb-2">DEPLOY</div>
            <h5 className="font-bold mb-2 text-fg-muted">Deploy to Permaweb with GitHub</h5>
            <p className="text-xs text-link">Auto-deploy sites to Arweave with GitHub Actions and ArNS.</p>
          </a>
        </div>
      )}
      </div>
    </div>
  );
}