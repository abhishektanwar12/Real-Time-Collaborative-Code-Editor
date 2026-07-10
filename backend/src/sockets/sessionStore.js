export function createRoomState(roomId) {
  return {
    id: roomId,
    code: '',
    users: [],
    messages: []
  };
}

export function addUserToRoom(roomState, user) {
  const hasExistingUser = roomState.users.some((entry) => entry.id === user.id);
  if (hasExistingUser) {
    return roomState;
  }

  return {
    ...roomState,
    users: [...roomState.users, user]
  };
}

export function removeUserFromRoom(roomState, userId) {
  return {
    ...roomState,
    users: roomState.users.filter((entry) => entry.id !== userId)
  };
}

export function updateRoomCode(roomState, editorContent) {
  return {
    ...roomState,
    code: editorContent
  };
}

export function addMessageToRoom(roomState, chatMessage) {
  return {
    ...roomState,
    messages: [...roomState.messages, chatMessage]
  };
}
