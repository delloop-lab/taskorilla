import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taskorilla - Swing Into Action',
  description: 'A marketplace for posting and bidding on tasks',
  icons: {
    icon: '/images/taskorilla-mascot.png',
    shortcut: '/images/taskorilla-mascot.png',
    apple: '/images/taskorilla-mascot.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
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



