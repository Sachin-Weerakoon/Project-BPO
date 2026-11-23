import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTypingScore, normalizeRating } from '../src/lib/typingScore.ts';
import { filterJobs, paginateJobs } from '../src/lib/jobSearch.ts';

const jobs = [
  { id: '1', title: 'Support agent', companyName: 'Example Co', location: 'Remote', processType: 'voice', requiredLanguages: ['English'], shift: 'Night shift' },
  { id: '2', title: 'Chat agent', companyName: 'Support Partners', location: 'Sri Lanka', processType: 'non-voice', requiredLanguages: ['Tamil'], shift: 'Day shift' },
  { id: '3', title: 'Data entry', companyName: 'Example Co', location: 'Remote', processType: 'data-entry', requiredLanguages: ['Sinhala'], shift: 'Flexible' },
];
const base = { keyword:'', process:'', language:'', shift:'' };
test('keyword matches title or company case-insensitively', () => assert.deepEqual(filterJobs(jobs, {...base, keyword:'SUPPORT'}).map(j=>j.id), ['1','2']));
test('process, language and shift can combine', () => assert.deepEqual(filterJobs(jobs, {...base, process:'non-voice',language:'tamil',shift:'Day'}).map(j=>j.id), ['2']));
test('saved-only view keeps only matching saved jobs', () => assert.deepEqual(filterJobs(jobs, base, ['3'], true).map(j=>j.id), ['3']));
test('pagination clamps page and preserves items', () => { const x=paginateJobs(jobs, 5, 2); assert.equal(x.page,2); assert.equal(x.pages,2); assert.equal(x.items.length,1); });
test('typing scoring handles an exact match', () => { const x=calculateTypingScore('hello','hello',60); assert.equal(x.accuracy,100); assert.equal(x.wpm,1); assert.equal(x.errors,0); });
test('typing scoring handles empty input', () => { const x=calculateTypingScore('hello','',0); assert.equal(x.accuracy,0); assert.equal(x.wpm,0); });
test('rating clamps to accepted values', () => { assert.equal(normalizeRating(99),5); assert.equal(normalizeRating(-5),1); });
