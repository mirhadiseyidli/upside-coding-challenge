import { useState, useEffect } from 'react';

interface Account {
  account_id: string;
  display_name: string;
}

interface Customer {
  customer_org_id: string;
  accounts: Account[];
}

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomer: { customer_org_id: string; account_id: string } | null;
  onSelectCustomer: (customer_org_id: string, account_id: string) => void;
  loading: boolean;
  error: string | null;
}

export default function CustomerSelector({
  customers,
  selectedCustomer,
  onSelectCustomer,
  loading,
  error
}: CustomerSelectorProps) {
  const [selectedCustomerOrg, setSelectedCustomerOrg] = useState<string>(
    selectedCustomer?.customer_org_id || ''
  );

  // Sync local state with prop changes
  useEffect(() => {
    setSelectedCustomerOrg(selectedCustomer?.customer_org_id || '');
  }, [selectedCustomer?.customer_org_id]);

  const handleCustomerChange = (customerOrgId: string) => {
    setSelectedCustomerOrg(customerOrgId);
    // Auto-select first account when customer changes
    const customer = customers.find(c => c.customer_org_id === customerOrgId);
    if (customer && customer.accounts.length > 0) {
      onSelectCustomer(customerOrgId, customer.accounts[0].account_id);
    }
  };

  const handleAccountChange = (accountId: string) => {
    if (selectedCustomerOrg) {
      onSelectCustomer(selectedCustomerOrg, accountId);
    }
  };

  const selectedCustomerData = customers.find(c => c.customer_org_id === selectedCustomerOrg);

  if (loading) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
        <div className="flex-1"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-red-600 dark:text-red-400">Error: {error}</span>
        <div className="flex-1"></div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-yellow-600 dark:text-yellow-400">No customers found</span>
        <div className="flex-1"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Customer Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Customer:
        </label>
        <select
          value={selectedCustomerOrg}
          onChange={(e) => handleCustomerChange(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
        >
          <option value="">Select Customer</option>
          {customers.map((customer) => (
            <option key={customer.customer_org_id} value={customer.customer_org_id}>
              {customer.customer_org_id}
            </option>
          ))}
        </select>
      </div>

      {/* Account Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Account:
        </label>
        <select
          value={selectedCustomer?.account_id || ''}
          onChange={(e) => handleAccountChange(e.target.value)}
          disabled={!selectedCustomerOrg || !selectedCustomerData}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select Account</option>
          {selectedCustomerData?.accounts.map((account) => (
            <option key={account.account_id} value={account.account_id}>
              {account.account_id}
            </option>
          ))}
        </select>
      </div>

      {/* Empty space filler */}
      <div className="flex-1"></div>
    </div>
  );
} 