import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaCoins, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { creditsAPI } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    billing: {
      plan: 'Professional',
      billingCycle: 'monthly',
      planPrice: '$99',
      nextBillingDate: '2024-02-15',
    },
    credits: {
      currentBalance: 0,
      totalUsed: 0,
      totalAdded: 0,
    },
  });
  const [loadingCredits, setLoadingCredits] = useState(true);

  useEffect(() => {
    fetchCreditData();
  }, []);

  const fetchCreditData = async () => {
    try {
      setLoadingCredits(true);

      // Fetch current balance and transaction history (no userId needed - gets current user's data)
      const [balanceResponse, transactionsResponse] = await Promise.all([
        creditsAPI.getBalance(),
        creditsAPI.getTransactions({ limit: 1000 })
      ]);

      const currentBalance = balanceResponse.data.credits || 0;
      const transactions = transactionsResponse.data.transactions || [];

      // Calculate total used and total added from transactions
      const totalUsed = transactions
        .filter(txn => txn.type === 'deduction')
        .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

      const totalAdded = transactions
        .filter(txn => txn.type === 'addition')
        .reduce((sum, txn) => sum + txn.amount, 0);

      setSettings(prev => ({
        ...prev,
        credits: {
          currentBalance,
          totalUsed,
          totalAdded,
        }
      }));
    } catch (err) {
      console.error('Error fetching credit data:', err);
    } finally {
      setLoadingCredits(false);
    }
  };

  // Calculate usage percentage based on total added credits
  const creditUsagePercentage = settings.credits.totalAdded > 0
    ? (settings.credits.totalUsed / settings.credits.totalAdded) * 100
    : 0;

  const getCycleLengthDays = (cycle) => {
    if (!cycle) return 30;
    return cycle.toLowerCase() === 'yearly' ? 365 : 30;
  };

  const cycleLengthDays = getCycleLengthDays(settings.billing.billingCycle);
  const nextBillingDate = settings.billing.nextBillingDate ? new Date(settings.billing.nextBillingDate) : null;
  const billingStartDate = nextBillingDate
    ? new Date(nextBillingDate.getTime() - cycleLengthDays * 24 * 60 * 60 * 1000)
    : null;
  const today = new Date();
  const rawDaysUsed = billingStartDate ? (today - billingStartDate) / (1000 * 60 * 60 * 24) : 0;
  const daysUsed = Math.min(cycleLengthDays, Math.max(0, Math.floor(rawDaysUsed)));
  const daysLeft = Math.max(0, cycleLengthDays - daysUsed);
  const planUsagePercent = cycleLengthDays > 0 ? (daysUsed / cycleLengthDays) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaCreditCard className="h-3 w-3" />
          <span>Account settings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your account and application settings
        </p>
      </div>

      {/* Billing & Subscription */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FaCreditCard className="text-emerald-500" size={20} />
          <h2 className="text-lg font-semibold text-zinc-900">
            Billing & Subscription
          </h2>
        </div>

        <div className="space-y-6">
          {/* Credits Section */}
          <div className="glass-card bg-gradient-to-r from-white to-emerald-50/60 p-6 border border-emerald-100/70 shadow-[0_15px_30px_rgba(16,185,129,0.08)]">
            <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3">
                <FaCoins className="text-yellow-500" size={20} />
                <h3 className="text-base font-semibold text-zinc-900">
                  Credits Usage
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full border border-emerald-200 text-xs font-medium text-emerald-700">
                Balance overview
              </span>
            </div>

            {loadingCredits ? (
              <div className="flex justify-center items-center py-8">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Current Balance</p>
                    <p className={`text-2xl font-semibold ${settings.credits.currentBalance <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {settings.credits.currentBalance.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {Math.floor(settings.credits.currentBalance / 60)} minutes
                    </p>
                  </div>
                  <div className="text-center sm:text-left border-x border-emerald-100 px-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Credits Used</p>
                    <p className="text-2xl font-semibold text-red-500">
                      {settings.credits.totalUsed.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {Math.floor(settings.credits.totalUsed / 60)} minutes
                    </p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Credits Added</p>
                    <p className="text-2xl font-semibold text-blue-500">
                      {settings.credits.totalAdded.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {Math.floor(settings.credits.totalAdded / 60)} minutes
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-600 mb-2">
                    <span>Usage</span>
                    <span className="font-semibold text-emerald-600">
                      {creditUsagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-4 bg-emerald-100/70 rounded-full overflow-hidden">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 transition-all"
                      style={{ width: `${Math.min(creditUsagePercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Plan usage */}
          <div className="glass-card bg-gradient-to-r from-white to-emerald-50/60 p-6 border border-emerald-100/70 shadow-[0_15px_30px_rgba(16,185,129,0.08)]">
            <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3">
                <FaCreditCard className="text-emerald-500" size={18} />
                <h3 className="text-base font-semibold text-zinc-900">
                  Plan Usage
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full border border-emerald-200 text-xs font-medium text-emerald-700">
                {settings.billing.plan} • {settings.billing.billingCycle}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="text-center sm:text-left">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Cycle</p>
                <p className="text-2xl font-semibold text-zinc-900">{cycleLengthDays} days</p>
                <p className="text-xs text-zinc-500 mt-1">Billing length</p>
              </div>
              <div className="text-center sm:text-left border-x border-emerald-100 px-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Days Used</p>
                <p className="text-2xl font-semibold text-emerald-600">{daysUsed}</p>
                <p className="text-xs text-zinc-500 mt-1">Consumed this cycle</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Days Left</p>
                <p className="text-2xl font-semibold text-sky-600">{daysLeft}</p>
                <p className="text-xs text-zinc-500 mt-1">{daysLeft > 0 ? 'Time remaining' : 'Renew today'}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-600 mb-2">
                <span>Cycle Progress</span>
                <span className="font-semibold text-emerald-600">{planUsagePercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-4 bg-emerald-100/70 rounded-full overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 transition-all"
                  style={{ width: `${Math.min(planUsagePercent, 100)}%` }}
                ></div>
              </div>
              {nextBillingDate && (
                <p className="text-xs text-zinc-500 mt-3">
                  Next billing on <span className="font-medium text-zinc-700">{nextBillingDate.toLocaleDateString()}</span>
                  {` (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
