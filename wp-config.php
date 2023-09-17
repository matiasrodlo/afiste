<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://codex.wordpress.org/Editing_wp-config.php
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'meyzjcmc_afiste' );

/** MySQL database username */
define( 'DB_USER', 'meyzjcmc_uafiste' );

/** MySQL database password */
define( 'DB_PASSWORD', 'afiste2019com' );

/** MySQL hostname */
define( 'DB_HOST', 'localhost' );

/** Database Charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The Database Collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         '%5V,%O[S2dN-;s0sD[cfA0Jw!=/w Y?7TWBdDWj+Z*&yXvzkOD#PYa56gz^3Mi55' );
define( 'SECURE_AUTH_KEY',  '9d)zoLZX@/4:y=Ma[-;$}hVb((<KNQVb ~(0VBPX^IUb@A)]nE;&+y<>c/eL?Dw#' );
define( 'LOGGED_IN_KEY',    '!4qkU^ZWhwDsJPZXdma{AuuxO=UYtf:S/{F?F`2REAvu*F1jNV)*Cs0X%S/sDj{d' );
define( 'NONCE_KEY',        '.M]tiD6%c2G=GiYe :Ym]Ad&bmv-n7~E6neQ%f?I`/vJvK49oeX%*|z>2Yw%dv7G' );
define( 'AUTH_SALT',        'U^jK5`Qlv2YozhB-UP.w>|[Lu5.8YK8v]DF7iB&d3 ET>0DwIZld*#^s(3`IxVcu' );
define( 'SECURE_AUTH_SALT', 'qW8JA}?>6YDh6Sh1rejtW%(BWS&Tf,e`G*^8VJ08bE-KM@05(}e)tEC5#0lRvy8!' );
define( 'LOGGED_IN_SALT',   'H5`bjqXYvIJ|KzW-C6:d]9MSm}$+/c-cMtOI4ok5.m)J6O4{16^l]*TCsom#Cjc.' );
define( 'NONCE_SALT',       '(3I9EH%[ps?M^`5XkYWL@|0|)?$N?M^g.MJ%8B=(RhZ? ;OUNB}_u6zYD2giR&4D' );

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the Codex.
 *
 * @link https://codex.wordpress.org/Debugging_in_WordPress
 */
define( 'WP_DEBUG', false );

/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

/** Sets up WordPress vars and included files. */
require_once( ABSPATH . 'wp-settings.php' );
