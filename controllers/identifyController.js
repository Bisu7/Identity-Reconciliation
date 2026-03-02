const pool = require('../db');

exports.identify = async (req, res) => {
  try {
    const { email = null, phoneNumber = null } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    //Find all contacts matching email OR phone
    const existingResult = await pool.query(
      `SELECT * FROM Contact
       WHERE email = $1 OR phoneNumber = $2
       ORDER BY createdAt ASC`,
      [email, phoneNumber]
    );

    const existingContacts = existingResult.rows;

    //If no contact exists → create new primary
    if (existingContacts.length === 0) {
      const newContact = await pool.query(
        `INSERT INTO Contact
         (email, phoneNumber, linkPrecedence)
         VALUES ($1, $2, 'primary')
         RETURNING *`,
        [email, phoneNumber]
      );

      const contact = newContact.rows[0];

      return res.status(200).json({
        contact: {
          primaryContatctId: contact.id,
          emails: contact.email ? [contact.email] : [],
          phoneNumbers: contact.phonenumber ? [contact.phonenumber] : [],
          secondaryContactIds: []
        }
      });
    }

    // Find all related contacts (including linked ones)
    const ids = existingContacts.map(c => c.id);
    const linkedIds = existingContacts
      .filter(c => c.linkedid !== null)
      .map(c => c.linkedid);

    const allIds = [...new Set([...ids, ...linkedIds])];

    const relatedResult = await pool.query(
      `SELECT * FROM Contact
       WHERE id = ANY($1) OR linkedId = ANY($1)
       ORDER BY createdAt ASC`,
      [allIds]
    );

    let allContacts = relatedResult.rows;

    let primaryContact = allContacts
      .filter(c => c.linkprecedence === 'primary')
      .sort((a, b) => new Date(a.createdat) - new Date(b.createdat))[0];

    // If multiple primaries → convert newer ones to secondary
    const primaryContacts = allContacts.filter(c => c.linkprecedence === 'primary');

    for (let contact of primaryContacts) {
      if (contact.id !== primaryContact.id) {
        await pool.query(
          `UPDATE Contact
           SET linkPrecedence = 'secondary',
               linkedId = $1,
               updatedAt = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [primaryContact.id, contact.id]
        );
      }
    }

    const refreshed = await pool.query(
      `SELECT * FROM Contact
       WHERE id = $1 OR linkedId = $1
       ORDER BY createdAt ASC`,
      [primaryContact.id]
    );

    allContacts = refreshed.rows;

    const emails = new Set();
    const phoneNumbers = new Set();

    allContacts.forEach(c => {
      if (c.email) emails.add(c.email);
      if (c.phonenumber) phoneNumbers.add(c.phonenumber);
    });

    const emailExists = email ? emails.has(email) : true;
    const phoneExists = phoneNumber ? phoneNumbers.has(phoneNumber) : true;

    if (!emailExists || !phoneExists) {
      const newSecondary = await pool.query(
        `INSERT INTO Contact
         (email, phoneNumber, linkedId, linkPrecedence)
         VALUES ($1, $2, $3, 'secondary')
         RETURNING *`,
        [email, phoneNumber, primaryContact.id]
      );

      const newContact = newSecondary.rows[0];

      if (newContact.email) emails.add(newContact.email);
      if (newContact.phonenumber) phoneNumbers.add(newContact.phonenumber);

      allContacts.push(newContact);
    }

    const secondaryContactIds = allContacts
      .filter(c => c.linkprecedence === 'secondary')
      .map(c => c.id);

    return res.status(200).json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: secondaryContactIds
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};