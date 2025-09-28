// Temporary suppression of Privy's DOM nesting warnings
// Remove this when Privy fixes their modal components

export function suppressPrivyDOMWarnings() {
  const originalError = console.error;
  console.error = (...args) => {
    // Suppress the specific DOM nesting warning from Privy
    if (
      args[0]?.includes?.('validateDOMNesting') &&
      args[0]?.includes?.('<div> cannot appear as a descendant of <p>')
    ) {
      return; // Suppress this specific warning
    }
    originalError.apply(console, args);
  };
}

// To restore original console.error
export function restoreConsoleError() {
  // This would need to store and restore the original
  // For now, just documenting that this exists
}