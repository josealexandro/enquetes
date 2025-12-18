import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const voteOnPoll = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { pollId, optionId } = data || {};
  if (!pollId || !optionId) {
    throw new functions.https.HttpsError('invalid-argument', 'pollId and optionId are required');
  }

  const pollRef = db.collection('polls').doc(pollId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(pollRef);
      if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Poll not found');
      }
      const poll = snap.data() as any;
      const votedBy: string[] = poll.votedBy || [];
      if (votedBy.includes(uid)) {
        throw new functions.https.HttpsError('failed-precondition', 'User has already voted');
      }

      const options = poll.options || [];
      const idx = options.findIndex((o: any) => o.id === optionId);
      if (idx === -1) {
        throw new functions.https.HttpsError('invalid-argument', 'Option not found');
      }

      // Increment selected option votes
      options[idx].votes = (typeof options[idx].votes === 'number' ? options[idx].votes : 0) + 1;

      // Update transactionally
      tx.update(pollRef, {
        options,
        votedBy: admin.firestore.FieldValue.arrayUnion(uid)
      });
    });

    return { success: true };
  } catch (err: any) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error('voteOnPoll error', err);
    throw new functions.https.HttpsError('internal', 'Erro ao processar voto');
  }
});
