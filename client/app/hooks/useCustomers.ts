import { useState, useEffect } from 'react';
import axios from 'axios';

interface Account {
  account_id: string;
  display_name: string;
}

interface Customer {
  customer_org_id: string;
  accounts: Account[];
}

interface CustomersResponse {
  customers: Customer[];
}

interface SelectedCustomer {
  customer_org_id: string;
  account_id: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const response = await axios.get<CustomersResponse>('http://localhost:8000/api/customers/');
        const customerList = response.data.customers;
        setCustomers(customerList);
        
        // Auto-select first customer and account if available
        if (customerList.length > 0 && customerList[0].accounts.length > 0) {
          setSelectedCustomer({
            customer_org_id: customerList[0].customer_org_id,
            account_id: customerList[0].accounts[0].account_id
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
        setError('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const selectCustomer = (customer_org_id: string, account_id: string) => {
    setSelectedCustomer({ customer_org_id, account_id });
  };

  return {
    customers,
    selectedCustomer,
    loading,
    error,
    selectCustomer
  };
} 