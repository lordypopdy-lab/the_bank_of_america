
import React from "react";

const SubscriptionExpired = () => {
  const SUBSCRIBE_URL = "https://harmonweb.com"; // Replace with your subscription URL

  const styles = {
    page: {
      minHeight: "100vh",
      width: "100%",
      background: "linear-gradient(145deg, #080d18, #111b2d)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "25px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#fff",
      boxSizing: "border-box",
    },
    card: {
      width: "100%",
      maxWidth: "490px",
      background: "rgba(20, 31, 49, 0.95)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: "20px",
      padding: "45px 35px",
      textAlign: "center",
      boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
      boxSizing: "border-box",
    },
    icon: {
      width: "78px",
      height: "78px",
      borderRadius: "22px",
      background: "rgba(245, 158, 11, 0.12)",
      border: "1px solid rgba(245,158,11,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 25px",
      fontSize: "35px",
    },
    label: {
      display: "inline-block",
      padding: "7px 13px",
      borderRadius: "30px",
      background: "rgba(245,158,11,0.12)",
      color: "#fbbf24",
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "1.2px",
      marginBottom: "18px",
    },
    heading: {
      fontSize: "29px",
      fontWeight: "750",
      margin: "0 0 15px",
      letterSpacing: "-0.8px",
    },
    description: {
      fontSize: "14px",
      color: "#9caec5",
      lineHeight: "1.8",
      margin: "0 auto 28px",
      maxWidth: "365px",
    },
    info: {
      background: "rgba(255,255,255,0.035)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "12px",
      padding: "17px",
      marginBottom: "27px",
      textAlign: "left",
    },
    infoTitle: {
      fontSize: "13px",
      fontWeight: "700",
      marginBottom: "7px",
      color: "#e2e8f0",
    },
    infoText: {
      fontSize: "12px",
      color: "#91a2b9",
      lineHeight: "1.7",
      margin: 0,
    },
    button: {
      width: "100%",
      padding: "16px",
      border: "none",
      borderRadius: "11px",
      background: "linear-gradient(135deg, #2563eb, #3b82f6)",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 8px 25px rgba(37,99,235,0.25)",
    },
    footer: {
      fontSize: "11px",
      color: "#718096",
      marginTop: "25px",
      lineHeight: "1.7",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>⌛</div>

        <div style={styles.label}>SUBSCRIPTION EXPIRED</div>

        <h1 style={styles.heading}>
          Your Free Hosting Has Ended
        </h1>

        <p style={styles.description}>
          Your 30-day complimentary hosting period has expired.
          To continue using your hosting services without interruption,
          please select a subscription plan.
        </p>

        <div style={styles.info}>
          <div style={styles.infoTitle}>
            What happens next?
          </div>
          <p style={styles.infoText}>
            Renew your hosting subscription through Harmon Web
            to continue enjoying your hosting services.
          </p>
        </div>

        <button
          style={styles.button}
          onClick={() => window.location.assign(SUBSCRIBE_URL)}
        >
          Subscribe Now &nbsp; →
        </button>

        <div style={styles.footer}>
          Secure subscription management powered by Harmon Web.
          <br />
          Thank you for choosing our hosting services.
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpired;
