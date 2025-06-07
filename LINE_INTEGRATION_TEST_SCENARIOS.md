# LINE Integration Test Scenarios for Genbapower QR Code Ordering System

## Overview
Comprehensive testing scenarios for LINE member card functionality with LIFF ID: `2007512112-vK9B1x69`

## Prerequisites Setup

### Environment Configuration
```bash
# .env file requirements
LIFF_ID=2007512112-vK9B1x69
LINE_CHANNEL_SECRET=ba1ef8d203f064b92125461b7d3901fb
APP_MODE=development
MONGODB_URI=mongodb+srv://cluster0.5gmgchv.mongodb.net/...
MONGODB_DB_NAME=genbapower
MONGODB_COLLECTION=orders
```

### Server Setup
```bash
npm start  # Node.js server on port 8000
ngrok http 8000  # Public URL generation
```

### LINE Developers Console Configuration
- **LIFF ID**: `2007512112-vK9B1x69`
- **Endpoint URL**: `https://[ngrok-url]/line-member-card.html`
- **Scope**: `profile openid`

## Test Scenarios

### 🔐 Scenario 1: LIFF Authentication Flow
**Objective**: Verify LINE login and authentication works correctly

**Prerequisites**: 
- LINE Developers console updated with current ngrok URL
- Server running in development mode

**Test Steps**:
1. Access LIFF URL: `https://liff.line.me/2007512112-vK9B1x69`
2. Verify LINE login screen appears
3. Complete LINE authentication
4. Verify redirect to member card page
5. Confirm user profile information displays

**Expected Results**:
- ✅ LINE login prompt appears
- ✅ Authentication completes successfully
- ✅ Redirects to correct ngrok URL
- ✅ User name and profile displayed
- ✅ No "ローカルモード" warning message

**Failure Indicators**:
- ❌ Redirect to offline/wrong URL
- ❌ "ローカルモード" warning appears
- ❌ Authentication errors in console

### 📱 Scenario 2: Member Card QR Code Generation
**Objective**: Verify QR code generation and display functionality

**Test Steps**:
1. After successful login, locate QR code section
2. Verify QR code displays (200x200px)
3. Scan QR code with external scanner
4. Verify QR contains LINE User ID
5. Test QR code in different orientations

**Expected Results**:
- ✅ QR code generates and displays properly
- ✅ QR code contains valid LINE User ID
- ✅ QR code remains scannable in all orientations
- ✅ Member ID format: `U1234567890abcdef`

### 💳 Scenario 3: Point Charging via QR Scan
**Objective**: Test QR code scanning for point charging

**Test Steps**:
1. Navigate to "ポイントチャージ" tab
2. Tap "QRコードをスキャン" button
3. Grant camera permissions
4. Scan test QR code with ticket ID
5. Verify auto-population of fields
6. Complete charging process

**Test Data**:
- **Ticket ID**: `TICKET123456789`
- **Passcode**: `123456`
- **Expected Points**: `1000`

**Expected Results**:
- ✅ Camera activates successfully
- ✅ QR scan populates ticket ID automatically
- ✅ Passcode field accepts input
- ✅ Charging process completes
- ✅ Point balance updates correctly

### 💰 Scenario 4: Manual Point Charging
**Objective**: Test manual ticket ID and passcode entry

**Test Steps**:
1. Navigate to "ポイントチャージ" tab
2. Manually enter ticket ID: `TICKET123456789`
3. Enter passcode: `123456`
4. Tap "次へ" button
5. Review confirmation screen
6. Execute charge with "チャージ実行"
7. Verify completion screen

**Expected Results**:
- ✅ Manual input accepts valid format
- ✅ Confirmation screen shows correct details
- ✅ Charge executes successfully
- ✅ Point balance increases by expected amount
- ✅ Success message displays

### 📊 Scenario 5: Transaction History Display
**Objective**: Verify transaction history and pagination

**Test Steps**:
1. Navigate to "利用履歴" tab
2. Verify transaction list displays
3. Check transaction details (date, amount, type)
4. Test "もっと見る" pagination
5. Verify balance chart displays

**Expected Results**:
- ✅ Transaction history loads correctly
- ✅ Transactions show proper formatting
- ✅ Pagination works for additional records
- ✅ Chart.js balance chart renders
- ✅ Data matches recent transactions

### 🏆 Scenario 6: Rank System Display
**Objective**: Test member rank calculation and display

**Test Steps**:
1. Verify current rank displays (BRONZE/SILVER/GOLD)
2. Check rank badge styling
3. Verify rank calculation based on points
4. Test rank upgrade scenarios

**Expected Results**:
- ✅ Rank displays correctly based on points
- ✅ Rank badge shows appropriate color
- ✅ Rank upgrades trigger notifications
- ✅ Rank thresholds work correctly

### ⚠️ Scenario 7: Error Handling Tests
**Objective**: Verify proper error handling for various failure cases

#### 7.1 Invalid Ticket Test
**Test Steps**:
1. Enter invalid ticket ID: `INVALID123`
2. Enter any passcode
3. Attempt to charge

**Expected Results**:
- ✅ Error message: "無効なチケットIDです"
- ✅ No points charged
- ✅ User can retry with valid ticket

#### 7.2 Network Error Test
**Test Steps**:
1. Enable airplane mode
2. Attempt any API operation
3. Verify error handling

**Expected Results**:
- ✅ Network error message displays
- ✅ App remains functional
- ✅ Retry mechanism available

#### 7.3 Camera Permission Denied
**Test Steps**:
1. Deny camera permissions
2. Attempt QR scan
3. Verify fallback behavior

**Expected Results**:
- ✅ Permission error message
- ✅ Manual input option available
- ✅ Clear instructions for user

### 🔄 Scenario 8: LIFF Outside Browser Test
**Objective**: Verify behavior when accessed outside LINE app

**Test Steps**:
1. Open LIFF URL in regular browser
2. Verify appropriate error/redirect
3. Test fallback functionality

**Expected Results**:
- ✅ LIFF error message displays
- ✅ Instructions to use LINE app
- ✅ No application crash

## Performance Tests

### Load Time Verification
- ✅ Initial page load < 3 seconds
- ✅ QR code generation < 1 second
- ✅ API responses < 2 seconds
- ✅ Camera activation < 2 seconds

### Memory Usage
- ✅ No memory leaks during extended use
- ✅ Proper cleanup of camera resources
- ✅ Chart.js instances properly disposed

## Security Tests

### Authentication Verification
- ✅ LINE token validation works
- ✅ User ID cannot be spoofed
- ✅ API endpoints require authentication
- ✅ Sensitive data not logged

### Data Protection
- ✅ User data encrypted in transit
- ✅ No sensitive data in localStorage
- ✅ Proper session management

## Browser Compatibility

### Mobile Browsers (Primary)
- ✅ LINE In-App Browser
- ✅ Safari Mobile (iOS)
- ✅ Chrome Mobile (Android)

### Desktop Browsers (Secondary)
- ✅ Chrome Desktop
- ✅ Safari Desktop
- ✅ Firefox Desktop

## Test Execution Checklist

### Pre-Test Setup
- [ ] Node.js server running on port 8000
- [ ] ngrok tunnel active and stable
- [ ] LINE Developers console updated with current URL
- [ ] .env file configured correctly
- [ ] MongoDB connection verified

### During Testing
- [ ] Document all test results with timestamps
- [ ] Capture screenshots for visual verification
- [ ] Record any error messages or console logs
- [ ] Note performance metrics

### Post-Test Verification
- [ ] All scenarios pass successfully
- [ ] No critical errors in browser console
- [ ] Server logs show no errors
- [ ] Database state remains consistent

## Troubleshooting Guide

### Common Issues

#### "ローカルモード" Warning Appears
- **Cause**: Environment variables not loaded properly
- **Solution**: Verify .env file and restart server

#### QR Scanner Not Working
- **Cause**: Camera permissions or HTTPS requirement
- **Solution**: Check permissions and ensure HTTPS via ngrok

#### Authentication Fails
- **Cause**: LINE Developers console URL mismatch
- **Solution**: Update endpoint URL in console

#### API 401 Errors
- **Cause**: LINE token validation failing
- **Solution**: Check LINE_CHANNEL_SECRET configuration

## Success Criteria

### Minimum Viable Testing
- ✅ LIFF authentication works
- ✅ QR code displays correctly
- ✅ Point charging completes successfully
- ✅ Transaction history loads

### Complete Testing
- ✅ All 8 scenarios pass
- ✅ Error handling verified
- ✅ Performance meets requirements
- ✅ Security tests pass
- ✅ Cross-browser compatibility confirmed

## Test Results Documentation

### Test Execution Log
```
Date: [YYYY-MM-DD]
Tester: [Name]
Environment: [ngrok URL]
LIFF ID: 2007512112-vK9B1x69

Scenario 1: [PASS/FAIL] - [Notes]
Scenario 2: [PASS/FAIL] - [Notes]
...
```

### Screenshots Required
- LINE login screen
- Member card with QR code
- Point charging interface
- Transaction history
- Error message examples

---

**Note**: This document should be updated as new features are added or test scenarios are modified. Always verify the latest ngrok URL and LINE Developers console configuration before testing.
