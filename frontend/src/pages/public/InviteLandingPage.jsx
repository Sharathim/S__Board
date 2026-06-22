import { Navigate } from "react-router-dom";

/**
 * Invite links have been removed.
 * Users now sign in via the homepage with role selection (HOD/Faculty/Student).
 * Redirect any visitors with old invite links to the homepage.
 */
export default function InviteLandingPage() {
  return <Navigate to="/" replace />;
}
