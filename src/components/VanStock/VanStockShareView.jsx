/**
 * @file VanStockShareView.jsx
 * @deprecated Removed as part of Task 1: External share links and public manifest viewing have been removed.
 * Unified in-app signing is now handled internally via VanStockRepView.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

export default function VanStockShareView() {
  return <Navigate to="/van-stock" replace />;
}
