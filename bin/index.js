#!/usr/bin/env node

let buildVersion = process.argv[ 2 ],
	helpStr = `
ckeditor4-nuget-release x.y.z [--push]`;

const path = require( 'path' ),
	os = require( 'os' ),
	exec = require( 'child-process-promise' ).exec,
	osTmpDir = require( 'tmp' ).dirSync,
	commandExists = require( 'command-exists' ),
	STANDARD_ALL = 'standard-all',
	NUGET_BIN = 'nuget',
	RELEASE_PATH = process.cwd();

if ( !buildVersion || process.argv.includes( '--help' ) ) {
	console.log( helpStr );
	process.exit( 0 );
} else if ( !String( buildVersion ).match( /^\d+\.\d+\.\d+$/ ) ) {
	console.log( 'Invlalid version format, use x.y.z format, e.g. "4.7.0".' );
	process.exit( 0 );
}

if ( path.basename( RELEASE_PATH ) != 'ckeditor-releases' ) {
	console.log( 'This script must be called from ckeditor-releases directory.' );
	process.exit( 0 );
}

function bundlePreset( presetName, version, buildDir ) {
	var releaseTag = presetName === STANDARD_ALL ? version : `${presetName}/${version}`;

	console.log( `---\nBundling ${presetName} NuGet package...` );

	// Checkout tag in release repo.
	return exec( `git co ${releaseTag}`, { cwd: RELEASE_PATH } )
		// Use nuget bin to bundle package.
		.then( res => {
			let nuspecPath = path.join( path.dirname( __filename ), '..', 'ckeditor.nuspec' ),
				cmd = `${NUGET_BIN} pack ${nuspecPath} -version ${version}`;

			cmd += ` -properties preset=-${presetName}`

			// Make sure sources are picked from ckeditor-releases dir and the build is
			// saved in a os tmp dir.
			cmd += ' -BasePath ' + RELEASE_PATH + ' -OutputDirectory ' + buildDir;

			return exec( cmd );
		} )
		.then( res => res ? console.log( 'NuGet output:', res.stdout ) : null )
		.then(() => console.log( `NuGet package for ${presetName} built.` ) )
		.catch( err => {
			throw new Error( `Error occured while bundling ${presetName} preset:\n` + err );
		} );
};

function publishPreset( presetName, version, buildDir ) {
	let nugetName = `ckeditor-${presetName}.${version}.nupkg`,
	// let nugetName = 'ckeditor' + ( presetName === STANDARD_ALL ? '' : '-' + presetName ) + `.${version}.nupkg`,
		cmd = `${NUGET_BIN} push ${path.join( buildDir, nugetName )} -Source https://www.nuget.org/api/v2/package`;

	// Checkout tag in release repo.
	return exec( cmd )
		.then( res => res ? console.log( 'NuGet output:', res.stdout ) : null )
		.then(() => console.log( `NuGet package for ${presetName} published.` ) )
		.catch( err => {
			throw new Error( `Error occured while publishing ${presetName} preset:\n` + err );
		} );
}

function checkNugetBinary() {
	return commandExists( NUGET_BIN )
		.catch( e => {
			throw new Error( `"${NUGET_BIN}" command is not in your system path. Add it and
run the script once again.` );
		} );
}

async function publishNugets() {
	let presets = [ 'basic', 'standard', 'standard-all', 'full' ],
		chain = Promise.resolve();

	try {
		await checkNugetBinary();

		let buildDir = osTmpDir().name;

		for ( let presetName of presets ) {
			await bundlePreset( presetName, buildVersion, buildDir );
		}

		if ( process.argv.includes( '--push' ) ) {
			console.log( 'Pushing NuGets...' );

			for ( let presetName of presets ) {
				await publishPreset( presetName, buildVersion, buildDir );
			}
		}
	} catch ( e ) {
		console.log( e );
	}
}

publishNugets();