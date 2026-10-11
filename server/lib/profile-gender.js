'use strict';
const gender = require('../../web/gender');
async function resolve(q, id, input) {
  if (input.gender === 'м' || input.gender === 'ж') return input.gender;
  const r = await q(`SELECT u.name,p.first_name,p.last_name,p.gender,
    ARRAY(SELECT DISTINCT r.gender::text FROM bookings b JOIN beds bd ON bd.id=b.bed_id JOIN rooms r ON r.id=bd.room_id
      WHERE b.user_id=u.id AND b.date_from<=CURRENT_DATE AND b.date_to>CURRENT_DATE
      AND (b.release_from IS NULL OR b.release_from>CURRENT_DATE) AND b.hold_until IS NULL) AS room_genders
    FROM users u LEFT JOIN resident_profiles p ON p.user_id=u.id WHERE u.id=$1`, [id]);
  const p = r.rows[0];
  if (!p) return null;
  const parts = String(p.name || '').trim().split(/\s+/);
  return gender.resolve({gender:p.gender, firstName:input.firstName || p.first_name || parts[1],
    lastName:input.lastName || p.last_name || parts[0], roomGenders:p.room_genders});
}
module.exports = {resolve};
