import '@testing-library/jest-dom';
import 'jest-fetch-mock';

global.fetchMock = require('jest-fetch-mock');
fetchMock.enableMocks();