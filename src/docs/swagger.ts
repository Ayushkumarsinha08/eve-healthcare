import swaggerJsdoc from 'swagger-jsdoc';

const json = (example: unknown) => ({ content: { 'application/json': { example } } });
const validationResponse = {
  description: 'Request validation failed.',
  content: { 'application/json': { example: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ path: 'field', message: 'Invalid value' }] } } } }
};
const authError = {
  description: 'Missing, invalid, or expired bearer token.',
  content: { 'application/json': { example: { success: false, error: { code: 'UNAUTHENTICATED', message: 'A bearer token is required' } } } }
};
const notFound = (code: string, message: string) => ({
  description: message,
  content: { 'application/json': { example: { success: false, error: { code, message } } } }
});
const body = (schema: Record<string, unknown>, example: unknown) => ({
  required: true,
  content: { 'application/json': { schema, example } }
});
const idParameter = (name: string) => ({
  in: 'path', name, required: true,
  schema: { type: 'string' },
  description: 'Prisma CUID. A positive integer is also accepted and converted to a string.'
});
const protectedSecurity = [{ bearerAuth: [] }];

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'EVE Healthcare API',
    version: '1.0.0',
    description: 'Diagnostic centre bookings and simulated payments.'
  },
  servers: [{ url: '/', description: 'Current server' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'], summary: 'Health check',
        responses: { '200': { description: 'API health status.', ...json({ success: true, data: { status: 'ok' } }) } }
      }
    },
    '/api/auth/signup': {
      post: {
        tags: ['Authentication'], summary: 'Create a user account',
        requestBody: body({ type: 'object', required: ['name', 'email', 'password'], properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 254 },
          password: { type: 'string', minLength: 8, maxLength: 72 }
        } }, { name: 'Asha Rao', email: 'asha@example.com', password: 'example-password' }),
        responses: {
          '201': { description: 'Created public user; password hash is omitted.', ...json({ success: true, data: { user: { id: 'cm123', name: 'Asha Rao', email: 'asha@example.com', createdAt: '2026-10-02T10:00:00Z', updatedAt: '2026-10-02T10:00:00Z' } } }) },
          '400': validationResponse,
          '409': notFound('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists')
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'], summary: 'Authenticate a user',
        requestBody: body({ type: 'object', required: ['email', 'password'], properties: {
          email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 72 }
        } }, { email: 'asha@example.com', password: 'example-password' }),
        responses: {
          '200': { description: 'Public user and signed JWT.', ...json({ success: true, data: { user: { id: 'cm123', name: 'Asha Rao', email: 'asha@example.com' }, token: 'jwt-token' } }) },
          '400': validationResponse,
          '401': notFound('INVALID_CREDENTIALS', 'Email or password is incorrect')
        }
      }
    },
    '/api/centres': {
      post: {
        tags: ['Centres'], summary: 'Create a diagnostic centre',
        requestBody: body({ type: 'object', required: ['name', 'location'], properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 }, location: { type: 'string', minLength: 1, maxLength: 200 }
        } }, { name: 'EVE Central Diagnostics', location: 'Bengaluru' }),
        responses: {
          '201': { description: 'Centre created.', ...json({ success: true, data: { centre: { id: 'cm123', name: 'EVE Central Diagnostics', location: 'Bengaluru' } } }) },
          '400': validationResponse,
          '409': { description: 'A centre with the same name and location already exists.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Centres'], summary: 'List diagnostic centres',
        responses: { '200': { description: 'Centres ordered by name.', ...json({ success: true, data: { centres: [] } }) } }
      }
    },
    '/api/centres/{id}': {
      get: {
        tags: ['Centres'], summary: 'Get centre with its tests', parameters: [idParameter('id')],
        responses: {
          '200': { description: 'Centre including tests ordered by name.', ...json({ success: true, data: { centre: { id: 'cm123', name: 'EVE Central Diagnostics', location: 'Bengaluru', tests: [] } } }) },
          '400': validationResponse,
          '404': notFound('CENTRE_NOT_FOUND', 'Diagnostic centre was not found')
        }
      }
    },
    '/api/tests': {
      post: {
        tags: ['Tests'], summary: 'Create a diagnostic test',
        requestBody: body({ type: 'object', required: ['name', 'price', 'centreId'], properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 }, price: { type: 'number', exclusiveMinimum: 0 }, centreId: { type: 'string' }
        } }, { name: 'Complete Blood Count', price: 450, centreId: 'cm123' }),
        responses: {
          '201': { description: 'Test created.', ...json({ success: true, data: { test: { id: 'cm456', name: 'Complete Blood Count', price: '450.00', centreId: 'cm123' } } }) },
          '400': validationResponse,
          '404': notFound('CENTRE_NOT_FOUND', 'Diagnostic centre was not found'),
          '409': { description: 'Test name already exists at that centre.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Tests'], summary: 'List tests with centre summaries',
        responses: { '200': { description: 'Tests ordered by name.', ...json({ success: true, data: { tests: [] } }) } }
      }
    },
    '/api/tests/{id}': {
      get: {
        tags: ['Tests'], summary: 'Get test with its centre', parameters: [idParameter('id')],
        responses: {
          '200': { description: 'Test and centre summary.', ...json({ success: true, data: { test: { id: 'cm456', name: 'Complete Blood Count', price: '450.00', centreId: 'cm123', centre: { id: 'cm123', name: 'EVE Central Diagnostics', location: 'Bengaluru' } } } }) },
          '400': validationResponse,
          '404': notFound('TEST_NOT_FOUND', 'Diagnostic test was not found')
        }
      }
    },
    '/api/bookings': {
      post: {
        tags: ['Bookings'], summary: 'Create a pending booking', security: protectedSecurity,
        requestBody: body({ type: 'object', required: ['testId', 'centreId', 'appointmentAt'], properties: {
          testId: { type: 'string' }, centreId: { type: 'string' }, appointmentAt: { type: 'string', format: 'date-time' }
        } }, { testId: 'cm456', centreId: 'cm123', appointmentAt: '2026-10-05T10:30:00Z' }),
        responses: {
          '201': { description: 'Booking created using the test price and PENDING status.', ...json({ success: true, data: { booking: { id: 'cm789', userId: 'cm111', testId: 'cm456', centreId: 'cm123', appointmentAt: '2026-10-05T10:30:00Z', amount: '450.00', status: 'PENDING' } } }) },
          '400': validationResponse,
          '401': authError,
          '404': { description: 'Test or centre not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Bookings'], summary: "List authenticated user's bookings", security: protectedSecurity,
        responses: { '200': { description: 'Owned bookings ordered by appointment time.', ...json({ success: true, data: { bookings: [] } }) }, '401': authError }
      }
    },
    '/api/bookings/{id}': {
      get: {
        tags: ['Bookings'], summary: 'Get an owned booking', security: protectedSecurity, parameters: [idParameter('id')],
        responses: {
          '200': { description: 'Booking with test and centre summaries.', ...json({ success: true, data: { booking: { id: 'cm789', status: 'PENDING' } } }) },
          '400': validationResponse, '401': authError, '404': notFound('BOOKING_NOT_FOUND', 'Booking was not found')
        }
      },
      delete: {
        tags: ['Bookings'], summary: 'Cancel an owned booking', description: 'Changes PENDING or CONFIRMED to CANCELLED; the row is retained.', security: protectedSecurity, parameters: [idParameter('id')],
        responses: {
          '200': { description: 'Booking marked CANCELLED.', ...json({ success: true, data: { booking: { id: 'cm789', status: 'CANCELLED' } } }) },
          '401': authError, '404': notFound('BOOKING_NOT_FOUND', 'Booking was not found'),
          '409': notFound('INVALID_BOOKING_STATUS', 'A failed booking cannot be cancelled')
        }
      }
    },
    '/api/payments': {
      post: {
        tags: ['Payments'], summary: 'Simulate payment for a pending booking',
        description: 'Randomly returns SUCCESS or FAILED. Amount is read from the booking; no real payment gateway is called.', security: protectedSecurity,
        requestBody: body({ type: 'object', required: ['bookingId'], properties: { bookingId: { type: 'string' } } }, { bookingId: 'cm789' }),
        responses: {
          '201': { description: 'Payment created and booking changed to CONFIRMED or FAILED.', ...json({ success: true, data: { payment: { id: 'cm999', bookingId: 'cm789', eventId: 'sim_event', amount: '450.00', status: 'SUCCESS' }, booking: { id: 'cm789', status: 'CONFIRMED' }, duplicate: false } }) },
          '400': validationResponse, '401': authError,
          '404': notFound('BOOKING_NOT_FOUND', 'Booking was not found'),
          '409': notFound('PAYMENT_ALREADY_PROCESSED', 'This booking already has a processed payment')
        }
      }
    },
    '/api/payments/webhook': {
      post: {
        tags: ['Payments'], summary: 'Process payment webhook',
        description: 'Unauthenticated and idempotent by eventId. paymentId is validated but not persisted by the current Payment model.', security: [],
        requestBody: body({ type: 'object', required: ['eventId', 'paymentId', 'bookingId', 'status'], properties: {
          eventId: { type: 'string', minLength: 1, maxLength: 200 }, paymentId: { type: 'string', minLength: 1, maxLength: 200 },
          bookingId: { type: 'string' }, status: { type: 'string', enum: ['SUCCESS', 'FAILED'] }
        } }, { eventId: 'evt_123', paymentId: 'external_123', bookingId: 'cm789', status: 'SUCCESS' }),
        responses: {
          '200': { description: 'Event applied or returned as successful duplicate.', ...json({ success: true, data: { payment: { id: 'cm999', bookingId: 'cm789', eventId: 'evt_123', amount: '450.00', status: 'SUCCESS' }, duplicate: false } }) },
          '400': validationResponse, '404': notFound('BOOKING_NOT_FOUND', 'Booking was not found'),
          '409': notFound('INVALID_BOOKING_STATE', 'Only pending bookings can be paid')
        }
      }
    }
  }
};

export const openApiSpec = swaggerJsdoc({ definition, apis: [] });
