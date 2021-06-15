const t = require('../test-lib/test.js');
const assert = require('assert');
let apos;

describe('Users', function() {

  // Password hashing can be slow
  this.timeout(20000);

  after(async () => {
    return t.destroy(apos);
  });

  // EXISTENCE

  it('should initialize', async () => {
    apos = await t.create({
      root: module
    });
  });

  // Test pieces.newInstance()
  it('should be able to insert a new user with an admin req', async () => {
    assert(apos.user.newInstance);
    const user = apos.user.newInstance();
    assert(user);

    user.title = 'Jane Doe';
    user.username = 'JaneD';
    user.password = '123password';
    user.email = 'jane@aol.com';
    user.role = 'admin';

    assert(user.type === '@apostrophecms/user');
    assert(apos.user.insert);
    await apos.user.insert(apos.task.getAdminReq(), user);
  });

  it('should not be able to insert a new user with any non-admin req or role', async () => {
    assert(apos.user.newInstance);
    const user = apos.user.newInstance();
    assert(user);

    user.title = 'Jim Fake';
    user.username = 'JimF';
    user.password = '123fakeguy';
    user.email = 'jim@fakeohno.coim';
    user.role = 'admin';

    assert(user.type === '@apostrophecms/user');
    assert(apos.user.insert);
    const getReqMethods = [ apos.task.getAnonReq, apos.task.getGuestReq, apos.task.getContributorReq, apos.task.getEditorReq ];
    let caught = 0;
    for (const getReqMethod of getReqMethods) {
      const req = getReqMethod();
      try {
        await apos.user.insert(req, user);
      } catch (e) {
        assert(e.name === 'forbidden');
        caught++;
      }
    }
    assert(caught === getReqMethods.length);
  });

  // verify a user's password
  // fail to verify the wrong password
  // fail to insert another user with the same email address
  // succeed in updating a user's property
  // verify a user's password after that user has been updated
  // change an existing user's password and verify the new password
  // verify that the user doc does not contain a password property at all

  // retrieve a user by their username

  let janeId;

  it('should be able to retrieve a user by their username', async () => {
    const user = await apos.user.find(apos.task.getReq(), { username: 'JaneD' }).toObject();
    assert(user && user.username === 'JaneD');
    janeId = user._id;
  });

  it('should verify a user password', async () => {
    const user = await apos.user.find(apos.task.getReq(), { username: 'JaneD' }).toObject();
    assert(user && user.username === 'JaneD');
    await apos.user.verifyPassword(user, '123password');
  });

  it('should not verify an incorrect user password', async () => {
    const user = await apos.user.find(apos.task.getReq(), { username: 'JaneD' }).toObject();
    try {
      await apos.user.verifyPassword(user, '321password');
      // Getting this far is bad, the password is intentionally wrong
      assert(false);
    } catch (e) {
      assert(e);
    }
  });

  it('should not be able to insert a new user if their email already exists', async () => {
    assert(apos.user.newInstance);
    const user = apos.user.newInstance();
    assert(user);

    user.title = 'Dane Joe';
    user.username = 'DaneJ';
    user.password = '321password';
    user.email = 'jane@aol.com';
    user.role = 'admin';
    assert(user.type === '@apostrophecms/user');

    assert(apos.user.insert);
    try {
      await apos.user.insert(apos.task.getReq(), user);
      assert(false);
    } catch (e) {
      assert(true);
    }
  });

  it('should be able to move a user to the archive', async () => {
    const user = await apos.user.find(apos.task.getReq(), { _id: janeId }).toObject();
    user.archived = true;
    await apos.user.update(apos.task.getReq(), user);
    const doc = await apos.doc.db.findOne({
      _id: user._id,
      archived: true
    });
    assert(doc);
  });

  it('should be able to insert a user with a previously used email if the other is in the archive', async () => {
    const user = apos.user.newInstance();

    user.title = 'Dane Joe';
    user.username = 'DaneJ';
    user.password = '321password';
    user.email = 'jane@aol.com';
    user.role = 'admin';
    await apos.user.insert(apos.task.getReq(), user);
  });

  it('should be able to rescue the first user from the archive and the username should revert, but the email should not because it is in use by a newer account', async () => {
    const user = await apos.user.find(apos.task.getReq(), { _id: janeId }).archived(true).toObject();
    user.archived = false;
    await apos.user.update(apos.task.getReq(), user);
    const doc = await apos.doc.db.findOne({
      _id: user._id,
      archived: { $ne: true }
    });
    assert(doc);
    assert(doc.username === 'JaneD');
    assert(doc.email.match(/deduplicate.*jane/));
  });

  it('there should be two users in the safe at this point and neither with a null username', async () => {
    const docs = await apos.user.safe.find({}).toArray();
    assert(docs.length === 2);
    for (const doc of docs) {
      assert(doc.username);
    }
  });

  it('should be able to move a user to the archive', async () => {
    const user = await apos.user.find(apos.task.getReq(), { _id: janeId }).toObject();
    user.archived = true;
    await apos.user.update(apos.task.getReq(), user);
    const doc = await apos.doc.db.findOne({
      _id: user._id,
      archived: true
    });
    assert(doc);
  });

  it('should be able to insert a user with a previously used username if the other is in the archive', async () => {
    const user = apos.user.newInstance();

    user.title = 'Dane Joe';
    user.username = 'JaneD';
    user.password = '321password';
    user.email = 'somethingelse@aol.com';
    user.role = 'admin';
    await apos.user.insert(apos.task.getReq(), user);
  });

  it('should be able to rescue the first user from the archive and the email and username should be deduplicated', async () => {
    const user = await apos.user.find(apos.task.getReq(), { _id: janeId }).archived(true).toObject();
    user.archived = false;
    await apos.user.update(apos.task.getReq(), user);
    const doc = await apos.doc.db.findOne({
      _id: user._id,
      archived: { $ne: true }
    });
    assert(doc);
    assert(doc.username.match(/deduplicate.*JaneD/));
    assert(doc.email.match(/deduplicate.*jane/));
  });

  it('there should be three users in the safe at this point and none with a null username', async () => {
    const docs = await apos.user.safe.find({}).toArray();
    assert(docs.length === 3);
    for (const doc of docs) {
      assert(doc.username);
    }
  });

  it('should succeed in updating a user\'s property', async () => {
    const user = await apos.user.find(apos.task.getReq(), { username: 'JaneD' }).toObject();
    assert(user);
    assert(user.username === 'JaneD');
    user.title = 'Jill Doe';
    await apos.user.update(apos.task.getReq(), user);
    const user2 = await apos.user.find(apos.task.getReq(), { _id: user._id }).toObject();
    assert(user2);
    assert(user2.title === 'Jill Doe');
  });

  it('should verify a user password after their info has been updated', async () => {
    const user = await apos.user.find(apos.task.getReq(), { username: 'JaneD' }).toObject();
    assert(user);
    assert(user.username === 'JaneD');
    await apos.user.verifyPassword(user, '321password');
  });

  // change an existing user's password and verify the new password
  it('should change an existing user password and verify the new password', async () => {
    const user = await apos.user.find(apos.task.getReq(), { username: 'JaneD' }).toObject();
    assert(user);
    assert(user.username === 'JaneD');
    assert(!user.password);
    user.password = 'password123';
    await apos.user.update(apos.task.getReq(), user);
    const user2 = await apos.user.find(apos.task.getReq(), { username: 'JaneD' }).toObject();
    await apos.user.verifyPassword(user2, 'password123');
  });

  it('should be able to insert a user with no password (but see next test...)', async () => {
    const user = apos.user.newInstance();

    user.title = 'Oops No Password';
    user.username = 'oopsnopassword';
    user.email = 'oopsnopassword@example.com';
    user.role = 'admin';

    assert(user.type === '@apostrophecms/user');
    assert(apos.user.insert);
    await apos.user.insert(apos.task.getAdminReq(), user);
  });

  it('should not be able to verify a blank password because a random password was set for us', async () => {
    const user = await apos.user.find(apos.task.getReq(), { username: 'oopsnopassword' }).toObject();
    assert(user && user.username === 'oopsnopassword');
    let good = false;
    try {
      // We want this to fail
      await apos.user.verifyPassword(user, '');
    } catch (e) {
      good = true;
    }
    assert(good);
  });

});
