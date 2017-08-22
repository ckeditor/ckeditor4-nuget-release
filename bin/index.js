#!/usr/bin/env node

let exec = require( 'child-process-promise' ).exec,
	commandExists = require( 'command-exists' ),
	buildVersion = process.argv[ 2 ],
	helpStr = `
ckeditor4-nuget-release x.y.z [--push]`;

const STANDARD_ALL = 'standard-all',
	NUGET_BIN = 'nuget';

if ( !buildVersion ) {
	console.log( helpStr );
	process.exit( 0 );
} else if ( !String( buildVersion ).match( /^\d+\.\d+\.\d+$/ ) ) {
	console.log( 'Invlalid version format, use x.y.z format, e.g. "4.7.0".' );
	process.exit( 0 );
}

function bundlePreset( presetName, version ) {
	var releaseTag = presetName === STANDARD_ALL ? version : `${presetName}/${version}`;

	console.log( `---\nBundling ${presetName} NuGet package...` );

	// Checkout tag in release repo.
	return exec( `git co ${releaseTag}`, { cwd: './ckeditor-releases' } )
		// Use nuget bin to bundle package.
		.then( res => {
			let cmd = `${NUGET_BIN} pack ckeditor.nuspec -version ${version}`;

			if ( presetName != STANDARD_ALL ) {
				cmd += ` -properties preset=-${presetName}`
			}

			return exec( cmd );
		} )
		.then( res => res ? console.log( 'NuGet output:', res.stdout ) : null )
		.then(() => console.log( `NuGet package for ${presetName} built.` ) )
		.catch( err => {
			throw new Error( `Error occured while bundling ${presetName} preset:\n` + err );
		} );
};

function publishPreset( presetName, version ) {
	let nugetName = 'ckeditor' + ( presetName === STANDARD_ALL ? '' : '-' + presetName ) + '.4.7.1.nupkg',
		cmd = `${NUGET_BIN} push ckeditor-basic.${version}.nupkg -Source https://www.nuget.org/api/v2/package`;

	console.log( cmd );

	// Disable publish command just yet.
	return Promise.resolve();

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
	// let presets = [ 'standard', 'standard-all', 'full' ],
	let presets = [ 'standard' ],
		chain = Promise.resolve();

	try {
		await checkNugetBinary();

		for ( let presetName of presets ) {
			await bundlePreset( presetName, buildVersion );
		}

		if ( process.argv.includes( '--push' ) ) {
			console.log( 'Pushing NuGets...' );

			for ( let presetName of presets ) {
				await publishPreset( presetName, buildVersion );
			}
		}
	} catch ( e ) {
		console.log( e );
	}
}

publishNugets();