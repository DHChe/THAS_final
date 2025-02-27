import React, { useEffect, useState } from 'react';
import { loadPayrollData } from '../utils/payrollLoader';

const TestPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPayrollData()
      .then(setData)
      .catch(setError);
  }, []);

  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h2>테스트 결과</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default TestPage;