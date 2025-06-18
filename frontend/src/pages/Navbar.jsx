import { Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { UserButton } from "@clerk/clerk-react";

function Navbar() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const handleToggle = () => {
    const navbarCollapse = document.getElementById("navbarNav");
    if (navbarCollapse) {
      navbarCollapse.classList.toggle("show");
    }
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark bg-gradient shadow-sm fixed-top"
      style={{
        background: "linear-gradient(135deg, #1a936f 0%, #114b5f 100%)",
        height: "70px",
      }}
    >
      <div className="container-fluid px-4">
        <Link
          to="/chat"
          className="navbar-brand fw-bold d-flex align-items-center text-black"
        >
          <i className="fas fa-leaf me-2"></i>
          FitPlanner
        </Link>
        <button
          className="navbar-toggler d-lg-none"
          type="button"
          onClick={handleToggle}
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Centered Pricing Link */}
          <ul className="navbar-nav mx-auto">
            <li className="nav-item">
              <Link to="/billing" className="nav-link text-black">
                Pricing
              </Link>
            </li>
          </ul>

          {/* Right-aligned Auth Items */}
          <ul className="navbar-nav">
            {isSignedIn ? (
              <li className="nav-item d-flex align-items-center">
                <span className="text-black me-3 d-none d-lg-inline">
                  Welcome,{" "}
                  {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
                </span>
                <UserButton afterSignOutUrl="/login" />
              </li>
            ) : (
              <li className="nav-item">
                <Link to="/login" className="nav-link text-black">
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
