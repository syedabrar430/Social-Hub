// Social Hub Integration for Rocket.Chat
(function() {
    'use strict';
    
    console.log('🚀 Social Hub Extension: Loading...');
    
    // Configuration
    const SOCIAL_HUB_URL = 'http://localhost:8080/feed';
    const ROCKET_CHAT_URL = 'http://10.68.0.49:30082/home';
    
    // Wait for Rocket.Chat to fully load
    function waitForRocketChat() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                // Check if Rocket.Chat avatar is loaded with multiple selectors
                const avatarElement = document.querySelector('.rcx-avatar--x24') || 
                                    document.querySelector('.rcx-avatar') ||
                                    document.querySelector('[data-username]') ||
                                    document.querySelector('img[src*="/avatar/"]') ||
                                    document.querySelector('.avatar') ||
                                    document.querySelector('[class*="avatar"]');
                
                if (avatarElement) {
                    clearInterval(checkInterval);
                    console.log('🚀 Social Hub Extension: Rocket.Chat avatar detected:', avatarElement);
                    resolve();
                } else {
                    console.log('🚀 Social Hub Extension: Still looking for avatar...');
                }
            }, 500);
            
            // Timeout after 15 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.log('🚀 Social Hub Extension: Timeout - proceeding anyway');
                resolve();
            }, 15000);
        });
    }
    
    // Create the Social Hub button next to the profile avatar
    function createSocialHubButton() {
        // Remove existing button if it exists
        const existingButton = document.getElementById('social-hub-extension-button');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Find the avatar container with multiple selectors
        const avatarContainer = document.querySelector('.rcx-avatar--x24') || 
                               document.querySelector('.rcx-avatar') ||
                               document.querySelector('[data-username]') ||
                               document.querySelector('img[src*="/avatar/"]') ||
                               document.querySelector('.avatar') ||
                               document.querySelector('[class*="avatar"]');
        
        console.log('🚀 Social Hub Extension: Looking for avatar container...');
        console.log('🚀 Social Hub Extension: Found avatar:', avatarContainer);
        
        if (!avatarContainer) {
            console.log('🚀 Social Hub Extension: Avatar container not found, trying fallback approach');
            // Fallback: try to find any element in the top-left area
            const sidebar = document.querySelector('[data-qa="sidebar"]') || 
                           document.querySelector('.sidebar') ||
                           document.querySelector('[class*="sidebar"]') ||
                           document.querySelector('nav') ||
                           document.querySelector('aside');
            
            if (sidebar) {
                console.log('🚀 Social Hub Extension: Found sidebar, creating button in top area');
                createFallbackButton(sidebar);
                return;
            } else {
                console.log('🚀 Social Hub Extension: No suitable container found');
                return;
            }
        }
        
        // Find the parent container that holds the avatar
        const parentContainer = avatarContainer.closest('.rcx-box') || 
                               avatarContainer.closest('[class*="box"]') ||
                               avatarContainer.parentElement ||
                               avatarContainer.closest('div');
        
        console.log('🚀 Social Hub Extension: Found parent container:', parentContainer);
        
        if (!parentContainer) {
            console.log('🚀 Social Hub Extension: Parent container not found');
            return;
        }
        
        // Create the button with same size as avatar
        const button = document.createElement('div');
        button.id = 'social-hub-extension-button';
        button.innerHTML = `
            <figure class="rcx-box rcx-box--full rcx-avatar rcx-avatar--x24" style="margin-left: 8px; cursor: pointer;">
                <div class="rcx-avatar__element" style="
                    height: 100%;
                    width: 100%;
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
                " 
                onmouseover="
                    this.style.transform='scale(1.1)';
                    this.style.boxShadow='0 4px 12px rgba(0, 123, 255, 0.5)';
                    this.style.background='linear-gradient(135deg, #0056b3, #004085)';
                " 
                onmouseout="
                    this.style.transform='scale(1)';
                    this.style.boxShadow='0 2px 8px rgba(0, 123, 255, 0.3)';
                    this.style.background='linear-gradient(135deg, #007bff, #0056b3)';
                "
                onmousedown="this.style.transform='scale(0.95)'"
                onmouseup="this.style.transform='scale(1.1)'"
                >
                    🚀
                </div>
            </figure>
        `;
        
        // Add click handler
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🚀 Social Hub Extension: Opening Social Hub...');
            
            // Open Social Hub in new tab
            window.open(SOCIAL_HUB_URL, '_blank', 'noopener,noreferrer');
            
            // Add visual feedback
            const buttonElement = button.querySelector('.rcx-avatar__element');
            const originalBg = buttonElement.style.background;
            buttonElement.style.background = 'linear-gradient(135deg, #28a745, #1e7e34)';
            buttonElement.innerHTML = '✅';
            
            setTimeout(() => {
                buttonElement.style.background = originalBg;
                buttonElement.innerHTML = '🚀';
            }, 1500);
        });
        
        // Insert the button next to the avatar
        parentContainer.appendChild(button);
        console.log('🚀 Social Hub Extension: Button added next to avatar');
        
        return button;
    }
    
    // Fallback function to create button in sidebar
    function createFallbackButton(container) {
        const button = document.createElement('div');
        button.id = 'social-hub-extension-button';
        button.innerHTML = `
            <div style="
                position: relative;
                width: 24px;
                height: 24px;
                background: linear-gradient(135deg, #007bff, #0056b3);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
                cursor: pointer;
                margin: 8px;
                z-index: 999999;
            " 
            onmouseover="
                this.style.transform='scale(1.1)';
                this.style.boxShadow='0 4px 12px rgba(0, 123, 255, 0.5)';
                this.style.background='linear-gradient(135deg, #0056b3, #004085)';
            " 
            onmouseout="
                this.style.transform='scale(1)';
                this.style.boxShadow='0 2px 8px rgba(0, 123, 255, 0.3)';
                this.style.background='linear-gradient(135deg, #007bff, #0056b3)';
            "
            >
                🚀
            </div>
        `;
        
        // Add click handler
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🚀 Social Hub Extension: Opening Social Hub...');
            
            // Open Social Hub in new tab
            window.open(SOCIAL_HUB_URL, '_blank', 'noopener,noreferrer');
            
            // Add visual feedback
            const buttonElement = button.querySelector('div');
            const originalBg = buttonElement.style.background;
            buttonElement.style.background = 'linear-gradient(135deg, #28a745, #1e7e34)';
            buttonElement.innerHTML = '✅';
            
            setTimeout(() => {
                buttonElement.style.background = originalBg;
                buttonElement.innerHTML = '🚀';
            }, 1500);
        });
        
        // Insert at the top of the sidebar
        container.insertBefore(button, container.firstChild);
        console.log('🚀 Social Hub Extension: Fallback button added to sidebar');
        
        return button;
    }
    
    // Insert Social Hub widget above the 'rocket.chat' DM entry
    function insertSocialHubAboveRocketChat() {
        // Try to find the DM list entry for "rocket.chat"
        const dmList = document.querySelectorAll('[data-qa="sidebar-item"]');
        let rocketChatEntry = null;
        dmList.forEach(item => {
            if (item.textContent && item.textContent.trim().toLowerCase().includes('rocket.chat')) {
                rocketChatEntry = item;
            }
        });

        if (rocketChatEntry) {
            // Remove existing Social Hub entry if present
            const existing = document.getElementById('social-hub-dm-entry');
            if (existing) existing.remove();

            // Create the Social Hub entry
            const socialHubDiv = document.createElement('div');
            socialHubDiv.id = 'social-hub-dm-entry';
            socialHubDiv.style.cssText = 'cursor:pointer;padding:8px 16px;display:flex;align-items:center;font-weight:bold;color:#007bff;background:#eaf4ff;border-radius:6px;margin-bottom:2px;';
            socialHubDiv.innerHTML = '🚀 Social Hub';

            socialHubDiv.onclick = () => {
                window.open('http://localhost:8080/feed', '_blank', 'noopener,noreferrer');
            };

            // Insert above the rocket.chat entry
            rocketChatEntry.parentNode.insertBefore(socialHubDiv, rocketChatEntry);
            console.log('🚀 Social Hub Extension: Inserted Social Hub above rocket.chat DM');
        } else {
            // Try again later if not found
            setTimeout(insertSocialHubAboveRocketChat, 1000);
        }
    }
    
    // Handle page navigation (for SPA)
    function handleNavigation() {
        const observer = new MutationObserver((mutations) => {
            let shouldRecreate = false;
            let shouldInsertSocialHub = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if avatar area changed
                    const addedNodes = Array.from(mutation.addedNodes);
                    const removedNodes = Array.from(mutation.removedNodes);
                    
                    if (addedNodes.some(node => 
                        node.nodeType === 1 && 
                        (node.classList?.contains('rcx-avatar') || 
                         node.querySelector?.('.rcx-avatar'))
                    ) || removedNodes.some(node => 
                        node.nodeType === 1 && 
                        (node.classList?.contains('rcx-avatar') || 
                         node.querySelector?.('.rcx-avatar'))
                    )) {
                        shouldRecreate = true;
                    }
                    // Check if DM list changed
                    if (addedNodes.some(node => 
                        node.nodeType === 1 && 
                        node.querySelector?.('[data-qa="sidebar-item"]')
                    ) || removedNodes.some(node => 
                        node.nodeType === 1 && 
                        node.querySelector?.('[data-qa="sidebar-item"]')
                    )) {
                        shouldInsertSocialHub = true;
                    }
                }
            });
            
            if (shouldRecreate) {
                console.log('🚀 Social Hub Extension: Avatar area changed, recreating button');
                setTimeout(createSocialHubButton, 1000);
            }
            if (shouldInsertSocialHub) {
                console.log('🚀 Social Hub Extension: DM list changed, reinserting Social Hub entry');
                setTimeout(insertSocialHubAboveRocketChat, 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Create a test button that always appears
    function createTestButton() {
        const testButton = document.createElement('div');
        testButton.id = 'social-hub-test-button';
        testButton.innerHTML = `
            <div style="
                position: absolute;
                left: 30px;
                bottom: 90px;
                z-index: 999999;
                background: #007bff;
                color: white;
                padding: 4px 14px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                font-family: Arial, sans-serif;
                height: 22px;
                display: flex;
                align-items: center;
                box-shadow: 0 2px 8px rgba(0,123,255,0.15);
            ">
                🚀 Social Hub
            </div>
        `;
        testButton.addEventListener('click', function() {
            window.open(SOCIAL_HUB_URL, '_blank', 'noopener,noreferrer');
        });
        // Insert just above the rocket.chat logo
        const rcLogo = document.querySelector('footer, .sidebar__footer, [class*="rocket-chat"]');
        if (rcLogo && rcLogo.parentNode) {
            rcLogo.parentNode.insertBefore(testButton, rcLogo);
        } else {
            document.body.appendChild(testButton);
        }
        console.log('🚀 Social Hub Extension: Social Hub button added');
    }
    
    // Initialize the extension
    async function init() {
        try {
            // Add test button first
            createTestButton();
            
            await waitForRocketChat();
            createSocialHubButton();
            insertSocialHubAboveRocketChat();
            handleNavigation();
            
            console.log('🚀 Social Hub Extension: Successfully initialized');
        } catch (error) {
            console.error('🚀 Social Hub Extension: Error during initialization:', error);
        }
    }
    
    // Start the extension
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();