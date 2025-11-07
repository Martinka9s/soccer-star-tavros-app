import React from 'react';

const PendingRequests: React.FC = () => {
  return (
    <div className="bg-dark-lighter border border-gray-700 rounded-lg p-12 text-center">
      <div className="text-gray-400 text-lg">No pending requests</div>
      <p className="text-gray-500 text-sm mt-2">All booking requests have been processed</p>
    </div>
  );
};

export default PendingRequests;
