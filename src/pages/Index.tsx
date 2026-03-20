// Index page redirects to auth flow
import { Navigate } from "react-router-dom";
export default function Index() {
  return <Navigate to="/auth" replace />;
}
