import { NextResponse } from 'next/server';

export default function DebugPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Mobile Detection Debug</h1>
      <p>Check your User-Agent string below:</p>
      <div
        id="user-agent"
        style={{
          padding: '1rem',
          background: '#f0f0f0',
          borderRadius: '8px',
          marginTop: '1rem',
          wordBreak: 'break-all',
        }}
      >
        Loading...
      </div>
      <div id="mobile-check" style={{ marginTop: '1rem' }}>
        Checking mobile detection...
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
        document.getElementById('user-agent').textContent = navigator.userAgent;
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(navigator.userAgent);
        
        document.getElementById('mobile-check').innerHTML = 
          '<strong>Is Mobile Detected:</strong> ' + isMobile + 
          '<br/><br/>' +
          '<strong>Current Path:</strong> ' + window.location.pathname +
          '<br/><br/>' +
          '<strong>Cookies:</strong><br/>' + document.cookie.split(';').map(c => c.trim()).join('<br/>');
      `,
        }}
      />
    </div>
  );
}
