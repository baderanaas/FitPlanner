import { PricingTable } from "@clerk/clerk-react";
import Navbar from "./Navbar";

function Billing() {
  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h1 className="text-center mb-4">Choose Your Plan</h1>
        <PricingTable
          appearance={{
            variables: {
              colorPrimary: "#1a936f",
              colorBackground: "#ffffff",
            },
          }}
        />
      </div>
    </>
  );
}

export default Billing;
