const pool = require('../db');

exports.identify = async (req, res) => {
    const { email = null, phoneNumber = null } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    const existingResult = await pool.query(
      `SELECT * FROM Contact
       WHERE email = $1 OR phoneNumber = $2
       ORDER BY createdAt ASC`,
      [email, phoneNumber]
    );

    const existingContacts = existingResult.rows;

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
};