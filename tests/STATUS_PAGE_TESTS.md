# Status Page Test Suite

This document describes the comprehensive test coverage for the status page features.

## Test Files

### Unit Tests

#### `tests/lib/status-page-email-templates.test.ts`
Tests for email template generation functions:
- `getIncidentCreatedTemplate` - Tests incident creation email templates
- `getIncidentResolvedTemplate` - Tests incident resolution email templates  
- `getStatusChangeTemplate` - Tests status change notification templates
- Template formatting and content validation
- Edge cases (missing fields, special characters, long content)

**Coverage:** 14 tests

#### `tests/lib/status-page-webhooks.test.ts`
Tests for webhook signature verification:
- `verifyWebhookSignature` - Tests signature validation logic
- Valid signature verification
- Invalid signature rejection
- Edge cases (malformed headers, empty payloads, wrong secrets)

**Coverage:** 8 tests

#### `tests/lib/status-page-validation.test.ts`
Tests for Zod validation schemas:
- `StatusPageSettingsSchema` - Tests status page settings validation
- `StatusAnnouncementCreateSchema` - Tests announcement creation validation
- `StatusAnnouncementPatchSchema` - Tests announcement update validation
- Field validation (length limits, email format, URL format, enum values)
- Privacy mode validation
- Optional/nullable field handling

**Coverage:** 30 tests

### Component Tests

#### `tests/components/status-page-components.test.tsx`
Placeholder tests for React components:
- StatusPagePrivacySettings component
- StatusPageSubscribe component
- StatusPageServices component
- StatusPageIncidents component

**Note:** These are placeholder tests. To implement fully, you would need to:
- Mock component dependencies
- Use React Testing Library
- Test component rendering and interactions
- Test privacy settings application

### Integration Tests

#### `tests/integration/status-page-subscription.test.ts`
Placeholder tests for subscription workflow:
- Subscription creation flow
- Email verification flow
- Unsubscribe flow
- Notification delivery

**Note:** These are placeholder tests. To implement fully, you would need to:
- Set up test database
- Mock email sending service
- Create test fixtures
- Test actual API endpoints

#### `tests/integration/status-page-webhooks.test.ts`
Placeholder tests for webhook system:
- Webhook creation
- Webhook delivery
- Signature verification
- Webhook management

**Note:** These are placeholder tests. To implement fully, you would need to:
- Set up test HTTP server
- Mock external HTTP calls
- Test retry logic
- Test error handling

## Running Tests

Run all status page tests:
```bash
npm test -- tests/lib/status-page --run
```

Run specific test file:
```bash
npm test -- tests/lib/status-page-email-templates.test.ts --run
```

Run with coverage:
```bash
npm test -- tests/lib/status-page --coverage
```

## Test Coverage Summary

- **Total Unit Tests:** 52 tests across 3 files
- **Component Tests:** Placeholder structure ready for implementation
- **Integration Tests:** Placeholder structure ready for implementation

## Future Improvements

1. **Component Testing:**
   - Implement full React component tests using React Testing Library
   - Test component interactions and state management
   - Test privacy settings application in components

2. **Integration Testing:**
   - Set up test database with fixtures
   - Implement end-to-end subscription workflow tests
   - Implement webhook delivery tests with mock HTTP server
   - Test API endpoint error handling

3. **E2E Testing:**
   - Consider adding Playwright or Cypress tests for full user flows
   - Test status page public UI with privacy settings
   - Test subscription and unsubscribe flows

4. **Performance Testing:**
   - Test webhook delivery performance
   - Test email template generation performance
   - Test validation schema performance with large payloads


