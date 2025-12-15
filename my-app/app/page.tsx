"use client";

import Script from "next/script";
import Sidebar from "./components/Sidebar";
import Viewer from "./components/Viewer";
import Floorplanner from "./components/Floorplanner";
import AddItems from "./components/AddItems";
import { Blueprint3DProvider } from "./context/Blueprint3DContext";

export default function Home() {
  return (
    <Blueprint3DProvider>
      {/* Mobile: hamburger + backdrop for off-canvas sidebar */}
      <button
        id="sidebar-toggle"
        className="btn btn-primary btn-sm visible-xs-inline-block"
        style={{ position: "fixed", top: "10px", left: "10px", zIndex: 2001 }}
      >
        <span className="glyphicon glyphicon-menu-hamburger"></span>
      </button>
      <div id="sidebar-backdrop" className="hidden-xs"></div>

      <div className="container-fluid">
        <div className="row main-row">
          {/* Left Column (responsive / off-canvas on phones) */}
          <Sidebar />

          {/* Right Column */}
          <div className="col-xs-12 col-sm-8 col-md-9 main">
            <Viewer />
            <Floorplanner />
            <AddItems />
          </div>
        </div>
      </div>

      {/* Optional PDF Loading Modal */}
      <div
        id="pdf-loading-modal"
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.8)",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div
            className="spinner"
            style={{
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #3498db",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              animation: "spin 2s linear infinite",
              margin: "0 auto 20px",
            }}
          ></div>
          <h3 id="pdf-loading-message">Generating PDF...</h3>
          <p>Please wait while we process your request.</p>
        </div>
      </div>

      {/* Scripts - Legacy scripts loaded in specific order for compatibility */}
      {/* Core Three.js library (r69 for legacy compatibility) */}
      <Script src="/js/three.min.js" strategy="beforeInteractive" />

      {/* Three.js addons */}
      <Script src="/vendor/GLTFLoader.js" strategy="afterInteractive" />

      {/* Blueprint3D core library (depends on THREE global) */}
      <Script src="/js/blueprint3d.js" strategy="afterInteractive" />

      {/* Model loader and scene patches */}
      <Script src="/js/model-loader.js" strategy="afterInteractive" />
      <Script src="/js/scene-patch.js" strategy="afterInteractive" />

      {/* jQuery and Bootstrap */}
      <Script src="/js/jquery.js" strategy="beforeInteractive" />
      <Script src="/js/bootstrap.js" strategy="afterInteractive" />

      {/* PDF export dependencies */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        strategy="afterInteractive"
      />
      <Script src="/js/pdfexport.js" strategy="afterInteractive" />

      {/* Application logic is now in React components */}
    </Blueprint3DProvider>
  );
}
