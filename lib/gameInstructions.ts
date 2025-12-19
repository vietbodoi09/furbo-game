import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';

// ========== PROGRAM CONFIG ==========
export const FURBO_PROGRAM_ID = new PublicKey('Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa');

// ========== FIXED DISCRIMINATORS ==========
const DISCRIMINATORS = {
  initialize_game: Buffer.from('2c3e6ef77ed082d7', 'hex'),
  register_player: Buffer.from('f292c2eee891e42a', 'hex'),
  game_action: Buffer.from('ab88c62f782cec7c', 'hex'),
  end_game: Buffer.from('e087f56343af79fc', 'hex'),
  update_session: Buffer.from('ad19eb4f28d99b67', 'hex'),
  batch_actions: Buffer.from('1dd472db841b1ee1', 'hex')
};

// ========== ACCOUNT SIZES ==========
export const ACCOUNT_SIZES = {
  GAME_STATE: 1200,
  PLAYER: 200
};

// ========== PDA FUNCTIONS ==========
export const getGameStatePDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game_state')],
    FURBO_PROGRAM_ID
  );
};

export const getPlayerPDA = (sessionKey: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('player'), sessionKey.toBuffer()],
    FURBO_PROGRAM_ID
  );
};

// ========== INSTRUCTION BUILDERS ==========

// 1. initialize_game
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  signer: PublicKey
): TransactionInstruction => {
  const data = DISCRIMINATORS.initialize_game;

  const keys = [
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];

  console.log('📦 InitializeGame Instruction:', {
    discriminator: data.toString('hex'),
    gameStatePDA: gameStatePDA.toString(),
    signer: signer.toString()
  });

  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data
  });
};

// 2. register_player - FIXED VERSION
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  name: string,
  sessionKey: PublicKey
): TransactionInstruction => {
  // 1. Serialize name theo Anchor (4 bytes length + string)
  const nameBuffer = Buffer.alloc(4 + 32); // Tối đa 32 chars
  nameBuffer.writeUInt32LE(name.length, 0);
  nameBuffer.write(name, 4, 'utf8');
  
  // 2. Serialize session key (32 bytes)
  const sessionKeyBuffer = sessionKey.toBuffer();
  
  // 3. Build data
  const data = Buffer.concat([
    DISCRIMINATORS.register_player, // 8 bytes
    nameBuffer.slice(0, 4 + name.length), // Chỉ lấy phần cần thiết
    sessionKeyBuffer // 32 bytes
  ]);

  console.log('🔧 RegisterPlayer Data Structure:', {
    discriminator: DISCRIMINATORS.register_player.toString('hex'),
    name: name,
    nameLength: name.length,
    nameHex: Buffer.from(name).toString('hex'),
    sessionKey: sessionKey.toString(),
    sessionKeyHex: sessionKeyBuffer.toString('hex'),
    totalDataBytes: data.length,
    expected: 8 + 4 + name.length + 32,
    dataHex: data.toString('hex')
  });

  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];

  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data
  });
};

// 3. game_action
export const createGameActionIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actionType: number,
  x: number,
  y: number
): TransactionInstruction => {
  const data = Buffer.alloc(8 + 1 + 2 + 2);
  let offset = 0;
  
  DISCRIMINATORS.game_action.copy(data, offset);
  offset += 8;
  
  data.writeUInt8(actionType, offset);
  offset += 1;
  
  data.writeUInt16LE(x, offset);
  offset += 2;
  
  data.writeUInt16LE(y, offset);

  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: false }
  ];

  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data
  });
};

// 4. end_game
export const createEndGameIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  finalScore: number,
  finalKills: number,
  finalShots: number
): TransactionInstruction => {
  const data = Buffer.alloc(8 + 8 + 4 + 4);
  let offset = 0;
  
  DISCRIMINATORS.end_game.copy(data, offset);
  offset += 8;
  
  data.writeBigUInt64LE(BigInt(finalScore), offset);
  offset += 8;
  
  data.writeUInt32LE(finalKills, offset);
  offset += 4;
  
  data.writeUInt32LE(finalShots, offset);

  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: false }
  ];

  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data
  });
};

// 5. update_session
export const createUpdateSessionIx = (
  playerPDA: PublicKey,
  signer: PublicKey,
  newSessionKey: PublicKey
): TransactionInstruction => {
  const sessionKeyBuffer = newSessionKey.toBuffer();
  const data = Buffer.concat([
    DISCRIMINATORS.update_session,
    sessionKeyBuffer
  ]);

  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: false }
  ];

  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data
  });
};

// ========== DEBUG FUNCTION ==========
export const debugRegisterPlayerData = (
  name: string,
  sessionKey: PublicKey
): void => {
  console.log('🔍 DEBUG RegisterPlayer Serialization:');
  console.log('Name:', name);
  console.log('Name length:', name.length);
  
  // Serialize như Anchor
  const nameBuffer = Buffer.alloc(4 + name.length);
  nameBuffer.writeUInt32LE(name.length, 0);
  nameBuffer.write(name, 4, 'utf8');
  
  console.log('Anchor serialized name (hex):', nameBuffer.toString('hex'));
  console.log('Session key:', sessionKey.toString());
  console.log('Session key bytes (hex):', sessionKey.toBuffer().toString('hex'));
  
  const fullData = Buffer.concat([
    DISCRIMINATORS.register_player,
    nameBuffer,
    sessionKey.toBuffer()
  ]);
  
  console.log('Full instruction data (hex):', fullData.toString('hex'));
  console.log('Total bytes:', fullData.length);
};
