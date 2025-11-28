import React from 'react';

const Customers = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <span>Customer management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Customers
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View and manage all your customers
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="glass-panel p-8">
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm">Customers page coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Customers;

