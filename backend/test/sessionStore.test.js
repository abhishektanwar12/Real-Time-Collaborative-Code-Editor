import test from 'node:test';
import assert from 'node:assert/strict';
import { addUserToRoom, createRoomState, updateRoomCode, addMessageToRoom } from '../src/sockets/sessionStore.js';

test('createRoomState creates an empty room with defaults', () => {
  const roomState = createRoomState('demo');

  assert.equal(roomState.id, 'demo');
  assert.equal(roomState.code, '');
  assert.deepEqual(roomState.users, []);
  assert.deepEqual(roomState.messages, []);
});

test('addUserToRoom appends a user and avoids duplicates', () => {
  const roomState = createRoomState('demo');
  const roomWithUser = addUserToRoom(roomState, { id: '1', name: 'Ada' });
  const duplicateRoomState = addUserToRoom(roomWithUser, { id: '1', name: 'Ada' });

  assert.equal(duplicateRoomState.users.length, 1);
  assert.equal(duplicateRoomState.users[0].name, 'Ada');
});

test('updateRoomCode and addMessageToRoom update room state', () => {
  let roomState = createRoomState('demo');
  roomState = updateRoomCode(roomState, 'console.log("hi")');
  roomState = addMessageToRoom(roomState, { user: 'Ada', text: 'hello' });

  assert.equal(roomState.code, 'console.log("hi")');
  assert.equal(roomState.messages[0].text, 'hello');
});
