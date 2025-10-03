// Debug script to investigate Pool Settings button click issue
// Run this in browser console to test the click functionality

console.log('🔧 DEBUGGING POOL SETTINGS BUTTON CLICK');

// Check if the button exists
const poolSettingsBtn = document.getElementById('tab-pool-settings');
console.log('Pool Settings Button:', poolSettingsBtn);

if (poolSettingsBtn) {
    console.log('✅ Button found in DOM');
    console.log('Button classes:', poolSettingsBtn.className);
    console.log('Button parent:', poolSettingsBtn.parentElement);
    
    // Check if it's in allUI.adminTabs
    const allAdminTabs = document.querySelectorAll('.admin-tab');
    console.log('All admin tabs found:', allAdminTabs.length);
    console.log('Admin tabs:', Array.from(allAdminTabs).map(tab => tab.id));
    
    const isInAdminTabs = Array.from(allAdminTabs).includes(poolSettingsBtn);
    console.log('Pool Settings button in admin tabs?', isInAdminTabs);
    
    // Check event listeners
    console.log('Checking event listeners...');
    
    // Try manual click
    console.log('Attempting manual click...');
    try {
        poolSettingsBtn.click();
        console.log('✅ Manual click succeeded');
    } catch (error) {
        console.error('❌ Manual click failed:', error);
    }
    
    // Check if switchToAdminTab function exists
    if (typeof switchToAdminTab === 'function') {
        console.log('✅ switchToAdminTab function exists');
        try {
            switchToAdminTab('tab-pool-settings');
            console.log('✅ Direct function call succeeded');
        } catch (error) {
            console.error('❌ Direct function call failed:', error);
        }
    } else {
        console.error('❌ switchToAdminTab function not found');
    }
    
} else {
    console.error('❌ Pool Settings Button not found in DOM');
}

// Check admin content section
const poolSettingsContent = document.getElementById('admin-content-pool-settings');
console.log('Pool Settings Content Section:', poolSettingsContent);

if (poolSettingsContent) {
    console.log('✅ Content section found');
    console.log('Content section classes:', poolSettingsContent.className);
} else {
    console.error('❌ Content section not found');
}

// Check if renderAdminPoolSettings function exists
if (typeof renderAdminPoolSettings === 'function') {
    console.log('✅ renderAdminPoolSettings function exists');
    try {
        renderAdminPoolSettings();
        console.log('✅ Direct renderAdminPoolSettings call succeeded');
    } catch (error) {
        console.error('❌ Direct renderAdminPoolSettings call failed:', error);
    }
} else {
    console.error('❌ renderAdminPoolSettings function not found');
}

console.log('🔧 DEBUG COMPLETE - Check results above');