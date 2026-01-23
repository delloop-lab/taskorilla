import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import PWAHead from '@/components/PWAHead'
import InstallPromptModal from '@/components/InstallPromptModal'
import PreLaunchModal from '@/components/PreLaunchModal'
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'
import SupabasePrewarm from '@/components/SupabasePrewarm'
import FacebookAppIdMeta from '@/components/FacebookAppIdMeta'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taskorilla - Swing Into Action',
  description: 'A marketplace for posting and bidding on tasks',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Taskorilla',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Taskorilla',
    // Note: fb:app_id requires 'property' attribute, not 'name', so it cannot be added via 'other' field
    // It must be added via a custom HTML injection (see root layout component)
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#FD9212',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Facebook App ID - must be static HTML for crawler to see it */}
        {process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && (
          <meta
            property="fb:app_id"
            content={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}
          />
        )}
      </head>
      <body className={inter.className}>
        {/* Global script to catch beforeinstallprompt immediately - prevents browser prompt */}
        {/* This must run before React hydrates, so it's placed at the top of body */}
        {/* Only run in production - PWA is disabled in development */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // Store the deferred prompt globally so React component can access it
                  window.deferredPrompt = null;
                  window.nativePromptBlocked = false;
                  window.browserPromptShown = false;
                  
                  // Mark that browser might show its prompt
                  // Some browsers show prompts automatically which we can't prevent
                  // We'll check if beforeinstallprompt fires - if it doesn't, browser might show its own
                  var promptCheckTimeout = setTimeout(function() {
                    // If beforeinstallprompt hasn't fired after 2 seconds, browser might show its own prompt
                    if (!window.deferredPrompt) {
                      console.log('⚠️ beforeinstallprompt not fired - browser may show its own prompt');
                      window.browserPromptShown = true;
                    }
                  }, 2000);
                  
                  // Listen for beforeinstallprompt event IMMEDIATELY with capture phase
                  // This ensures we catch it before any other handlers
                  var handler = function(e) {
                    clearTimeout(promptCheckTimeout);
                    
                    // Prevent the browser's default install prompt
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    
                    // Store the event globally
                    window.deferredPrompt = e;
                    window.nativePromptBlocked = true;
                    window.browserPromptShown = false;
                    
                    // Dispatch a custom event so React component knows it's available
                    window.dispatchEvent(new CustomEvent('pwa-install-available'));
                    
                    console.log('✅ Install prompt intercepted and deferred');
                  };
                  
                  // Add listener in capture phase (runs first)
                  window.addEventListener('beforeinstallprompt', handler, true);
                  
                  // Also add to document for extra coverage
                  if (document) {
                    document.addEventListener('beforeinstallprompt', handler, true);
                  }
                })();
              `,
            }}
          />
        )}
        <FacebookAppIdMeta />
        <LanguageProviderWrapper>
          <PWAHead />
          <SupabasePrewarm />
          <PreLaunchModal />
          <InstallPromptModal />
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </LanguageProviderWrapper>
        {/* Global script to replace rgb(25, 179, 148) with rgb(253, 146, 18) in SurveyJS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const greenColor = 'rgb(25, 179, 148)';
                const orangeColor = 'rgb(253, 146, 18)';
                const greenColorNoSpaces = 'rgb(25,179,148)';
                const greenHex = '#19B394';
                const greenHexLower = '#19b394';
                
                function replaceGreenColors() {
                  const wrapper = document.querySelector('.surveyjs-form-wrapper');
                  if (!wrapper) return;
                  
                  // Find all elements with the green color
                  const allElements = wrapper.querySelectorAll('*');
                  allElements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    
                    // Check background color
                    if (style.backgroundColor === greenColor || 
                        style.backgroundColor === greenColorNoSpaces ||
                        el.style.backgroundColor === greenColor ||
                        el.style.backgroundColor === greenColorNoSpaces) {
                      el.style.backgroundColor = orangeColor;
                    }
                    
                    // Check border color (all border properties)
                    if (style.borderColor === greenColor || 
                        style.borderColor === greenColorNoSpaces ||
                        el.style.borderColor === greenColor ||
                        el.style.borderColor === greenColorNoSpaces) {
                      el.style.borderColor = orangeColor;
                    }
                    
                    // Check border-top-color specifically (for horizontal lines)
                    if (style.borderTopColor === greenColor || 
                        style.borderTopColor === greenColorNoSpaces ||
                        el.style.borderTopColor === greenColor ||
                        el.style.borderTopColor === greenColorNoSpaces) {
                      el.style.borderTopColor = orangeColor;
                      el.style.borderTop = el.style.borderTop ? el.style.borderTop.replace(greenColor, orangeColor).replace(greenColorNoSpaces, orangeColor) : '2px solid ' + orangeColor;
                    }
                    
                    // Check border-bottom-color
                    if (style.borderBottomColor === greenColor || 
                        style.borderBottomColor === greenColorNoSpaces ||
                        el.style.borderBottomColor === greenColor ||
                        el.style.borderBottomColor === greenColorNoSpaces) {
                      el.style.borderBottomColor = orangeColor;
                    }
                    
                    // Check border-left-color
                    if (style.borderLeftColor === greenColor || 
                        style.borderLeftColor === greenColorNoSpaces ||
                        el.style.borderLeftColor === greenColor ||
                        el.style.borderLeftColor === greenColorNoSpaces) {
                      el.style.borderLeftColor = orangeColor;
                    }
                    
                    // Check border-right-color
                    if (style.borderRightColor === greenColor || 
                        style.borderRightColor === greenColorNoSpaces ||
                        el.style.borderRightColor === greenColor ||
                        el.style.borderRightColor === greenColorNoSpaces) {
                      el.style.borderRightColor = orangeColor;
                    }
                    
                    // Check inline style attribute for any green color
                    if (el.style.borderTop && (el.style.borderTop.includes(greenColor) || el.style.borderTop.includes(greenColorNoSpaces) || el.style.borderTop.includes('#19B394') || el.style.borderTop.includes('#19b394'))) {
                      el.style.borderTop = el.style.borderTop.replace(greenColor, orangeColor).replace(greenColorNoSpaces, orangeColor).replace(/#19[Bb]394/g, '#FD9212');
                    }
                    
                    // Check color
                    if (style.color === greenColor || 
                        style.color === greenColorNoSpaces ||
                        el.style.color === greenColor ||
                        el.style.color === greenColorNoSpaces) {
                      el.style.color = orangeColor;
                    }
                  });
                  
                  // Handle SVG elements
                  const svgElements = wrapper.querySelectorAll('svg path, svg circle, svg rect, svg polygon, svg polyline, svg line');
                  svgElements.forEach(svg => {
                    const fill = svg.getAttribute('fill');
                    const stroke = svg.getAttribute('stroke');
                    const style = svg.getAttribute('style') || '';
                    
                    if (fill === greenColor || fill === greenColorNoSpaces || fill === greenHex || fill === greenHexLower ||
                        style.includes(greenColor) || style.includes(greenColorNoSpaces) || style.includes(greenHex) || style.includes(greenHexLower)) {
                      svg.setAttribute('fill', orangeColor);
                      if (style) {
                        svg.setAttribute('style', style.replace(new RegExp(greenColor.replace(/[()]/g, '\\\\$&'), 'g'), orangeColor)
                          .replace(new RegExp(greenColorNoSpaces.replace(/[()]/g, '\\\\$&'), 'g'), orangeColor)
                          .replace(/#19[Bb]394/g, '#FD9212'));
                      }
                    }
                    
                    if (stroke === greenColor || stroke === greenColorNoSpaces || stroke === greenHex || stroke === greenHexLower ||
                        style.includes(greenColor) || style.includes(greenColorNoSpaces) || style.includes(greenHex) || style.includes(greenHexLower)) {
                      svg.setAttribute('stroke', orangeColor);
                      if (style) {
                        svg.setAttribute('style', style.replace(new RegExp(greenColor.replace(/[()]/g, '\\\\$&'), 'g'), orangeColor)
                          .replace(new RegExp(greenColorNoSpaces.replace(/[()]/g, '\\\\$&'), 'g'), orangeColor)
                          .replace(/#19[Bb]394/g, '#FD9212'));
                      }
                    }
                  });
                }
                
                // Run immediately
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', replaceGreenColors);
                } else {
                  replaceGreenColors();
                }
                
                // Run on SurveyJS form updates
                const observer = new MutationObserver(() => {
                  replaceGreenColors();
                });
                
                // Start observing when wrapper appears
                const checkWrapper = setInterval(() => {
                  const wrapper = document.querySelector('.surveyjs-form-wrapper');
                  if (wrapper) {
                    observer.observe(wrapper, {
                      childList: true,
                      subtree: true,
                      attributes: true,
                      attributeFilter: ['style', 'fill', 'stroke']
                    });
                    clearInterval(checkWrapper);
                  }
                }, 100);
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}



