(function()
{
	App.MODE_WEBDEV = 'webdev';

	function ensureWebdevClient(editorUi)
	{
		if (editorUi == null || editorUi.webdev != null || typeof WebdevClient !== 'function')
		{
			return (editorUi != null) ? editorUi.webdev : null;
		}

		try
		{
			editorUi.webdev = new WebdevClient(editorUi);
			editorUi.webdev.addListener('userChanged', mxUtils.bind(editorUi, function()
			{
				this.updateButtonContainer();
				this.restoreLibraries();
			}));
			editorUi.fireEvent(new mxEventObject('clientLoaded', 'client', editorUi.webdev));
		}
		catch (e)
		{
			if (window.console != null)
			{
				console.log('WebdevClient disabled: ' + e.message);
			}
		}

		return editorUi.webdev;
	}

	function isBlockedMode(mode)
	{
		return mode == App.MODE_GOOGLE || mode == App.MODE_ONEDRIVE || mode == App.MODE_M365 ||
			mode == App.MODE_DROPBOX || mode == App.MODE_GITHUB || mode == App.MODE_GITLAB;
	}

	function isBlockedOptionValue(value)
	{
		return value != null && /^(?:pickFolder-)?(google|onedrive|m365|dropbox|github|gitlab)(-|$)/.test(value);
	}

	function isServiceSelect(select)
	{
		if (select == null || select.options == null)
		{
			return false;
		}

		for (var i = 0; i < select.options.length; i++)
		{
			var value = select.options[i].value;

			if (value == App.MODE_WEBDEV || value == App.MODE_TRELLO || value == App.MODE_DEVICE ||
				value == App.MODE_BROWSER || value == 'download' || value == '_blank' ||
				isBlockedOptionValue(value) || (value != null && value.substring(0, 11) == 'pickFolder-'))
			{
				return true;
			}
		}

		return false;
	}

	function patchServiceSelect(editorUi, select, allowWebdev)
	{
		if (!isServiceSelect(select))
		{
			return;
		}

		var selected = select.value;
		var hasWebdev = false;

		for (var i = select.options.length - 1; i >= 0; i--)
		{
			var option = select.options[i];
			var value = option.value;

			if (value == App.MODE_WEBDEV)
			{
				hasWebdev = true;
			}
			else if (isBlockedOptionValue(value))
			{
				select.removeChild(option);
			}
		}

		if (allowWebdev && editorUi.webdev != null && !hasWebdev)
		{
			var webdavOption = document.createElement('option');
			webdavOption.setAttribute('value', App.MODE_WEBDEV);
			mxUtils.write(webdavOption, 'WebDAV');
			select.insertBefore(webdavOption, select.firstChild);
		}

		if (allowWebdev && editorUi.webdev != null && (selected == null || selected == '' || isBlockedOptionValue(selected)))
		{
			select.value = App.MODE_WEBDEV;
		}
	}

	function getServiceSelect(container)
	{
		if (container == null)
		{
			return null;
		}

		var selects = container.getElementsByTagName('select');

		for (var i = 0; i < selects.length; i++)
		{
			if (isServiceSelect(selects[i]))
			{
				return selects[i];
			}
		}

		return null;
	}

	function patchSaveButton(container, select, saveAsInput, saveFn)
	{
		if (container == null || select == null || saveAsInput == null || saveFn == null)
		{
			return;
		}

		var buttons = container.getElementsByTagName('button');

		for (var i = 0; i < buttons.length; i++)
		{
			var button = buttons[i];

				if (button.className != null && button.className.indexOf('gePrimaryBtn') >= 0 && !button.__webdevPatched)
				{
					button.__webdevPatched = true;
					mxEvent.addListener(button, 'click', function(evt)
					{
						if (select.value == App.MODE_WEBDEV)
						{
							evt.preventDefault();
							evt.stopPropagation();
							evt.stopImmediatePropagation();
							saveFn(saveAsInput, App.MODE_WEBDEV, null);
						}
					});
					break;
				}
		}
	}

	function patchCreateButtons(editorUi, container, createFn, hideDialog)
	{
		if (container == null)
		{
			return;
		}

		var buttonsRoot = null;
		var hasWebdav = false;
		var anchors = container.getElementsByTagName('a');

		for (var i = anchors.length - 1; i >= 0; i--)
		{
			var anchor = anchors[i];

			if (anchor.className != 'geBaseButton')
			{
				continue;
			}

			buttonsRoot = (buttonsRoot != null) ? buttonsRoot : anchor.parentNode;
			var img = anchor.getElementsByTagName('img')[0];
			var src = (img != null) ? (img.getAttribute('src') || img.src || '') : '';
			var text = (anchor.textContent || '').toLowerCase();

			if (text.indexOf('webdav') >= 0)
			{
				hasWebdav = true;
			}
			else if (/google-drive-logo|onedrive-logo|dropbox-logo|github-logo|gitlab-logo/.test(src))
			{
				anchor.parentNode.removeChild(anchor);
			}
		}

		if (editorUi.webdev == null || hasWebdav || buttonsRoot == null)
		{
			return;
		}

		var nameInput = container.getElementsByTagName('input')[0];
		var button = document.createElement('a');
		button.style.overflow = 'hidden';
		button.style.display = 'inline-block';
		button.className = 'geBaseButton';
		button.style.position = 'relative';
		button.style.margin = '4px';
		button.style.padding = '8px 8px 10px 8px';
		button.style.whiteSpace = 'nowrap';
		button.style.color = 'gray';
		button.style.fontSize = '11px';

		var logo = document.createElement('img');
		logo.src = IMAGE_PATH + '/osa_drive-harddisk.png';
		logo.setAttribute('border', '0');
		logo.setAttribute('align', 'absmiddle');
		logo.style.width = '60px';
		logo.style.height = '60px';
		logo.style.paddingBottom = '6px';
		button.appendChild(logo);

		var label = document.createElement('div');
		mxUtils.write(label, 'WebDAV');
		button.appendChild(label);

		mxEvent.addListener(button, 'click', function()
		{
			if (hideDialog)
			{
				editorUi.hideDialog();
			}

			createFn((nameInput != null) ? nameInput.value : '', App.MODE_WEBDEV, nameInput);
		});

		buttonsRoot.insertBefore(button, buttonsRoot.firstChild);
	}

	var appInit = App.prototype.init;
	App.prototype.init = function()
	{
		appInit.apply(this, arguments);
		ensureWebdevClient(this);
	};

	var getModeForChar = App.prototype.getModeForChar;
	App.prototype.getModeForChar = function(char)
	{
		return (char == 'W') ? App.MODE_WEBDEV : getModeForChar.apply(this, arguments);
	};

	var loadFile = App.prototype.loadFile;
	App.prototype.loadFile = function(id, force, sameWindow, success, ignoreEmbeddedXml)
	{
		if (id != null && id.length > 0 && id.charAt(0) == 'W')
		{
			var currentFile = this.getCurrentFile();
			var fn = mxUtils.bind(this, function()
			{
				if (force || currentFile == null || !currentFile.isModified())
				{
					var peer = this.getServiceForName(App.MODE_WEBDEV);
					if (peer == null)
					{
						this.handleError({message: mxResources.get('serviceUnavailableOrBlocked')},
							mxResources.get('errorLoadingFile'));
					}
					else if (this.spinner.spin(document.body, mxResources.get('loading')))
					{
						peer.getFile(decodeURIComponent(id.substring(1)), mxUtils.bind(this, function(file)
						{
							this.spinner.stop();
							this.fileLoaded(file);
							if (success != null)
							{
								success();
							}
						}), mxUtils.bind(this, function(resp)
						{
							this.spinner.stop();
							this.handleError(resp, mxResources.get('errorLoadingFile'));
						}));
					}
				}
				else
				{
					this.confirm(mxResources.get('allChangesLost'), mxUtils.bind(this, function()
					{
						if (currentFile != null)
						{
							window.location.hash = currentFile.getHash();
						}
					}), mxUtils.bind(this, function()
					{
						this.loadFile(id, true, sameWindow, success, ignoreEmbeddedXml);
					}), mxResources.get('cancel'), mxResources.get('discardChanges'));
				}
			});

			fn();
			return;
		}

		return loadFile.apply(this, arguments);
	};

	var isModeEnabled = App.prototype.isModeEnabled;
	App.prototype.isModeEnabled = function(mode)
	{
		return (mode == App.MODE_WEBDEV) ? true : isModeEnabled.apply(this, arguments);
	};

	var getServiceForName = App.prototype.getServiceForName;
	App.prototype.getServiceForName = function(name)
	{
		return (name == App.MODE_WEBDEV) ? this.webdev : getServiceForName.apply(this, arguments);
	};

	var getTitleForService = App.prototype.getTitleForService;
	App.prototype.getTitleForService = function(name)
	{
		return (name == App.MODE_WEBDEV) ? 'WebDAV' : getTitleForService.apply(this, arguments);
	};

	var createFile = App.prototype.createFile;
	App.prototype.createFile = function(title, data, libs, mode, done, replace, folderId, tempFile, clibs, success)
	{
		var targetMode = (tempFile) ? null : ((mode != null) ? mode : this.mode);

		if (targetMode != App.MODE_WEBDEV || this.webdev == null)
		{
			return createFile.apply(this, arguments);
		}

		EditorUi.debug('App.createFile', [this],
			'title', [title], 'data', [data],
			'libs', [libs], 'mode', [targetMode]);

		if (title != null && this.spinner.spin(document.body, mxResources.get('inserting')))
		{
			data = (data != null) ? data : this.emptyDiagramXml;

			if (data != null && !Editor.defaultCompressed)
			{
				data = this.uncompressPages(data);
			}

			var complete = mxUtils.bind(this, function()
			{
				this.spinner.stop();
			});

			var error = mxUtils.bind(this, function(resp)
			{
				complete();

				if (resp == null && this.getCurrentFile() == null && this.dialog == null)
				{
					this.showSplash();
				}
				else if (resp != null)
				{
					this.handleError(resp);
				}
			});

			try
			{
				var fileCreated = mxUtils.bind(this, function(file)
				{
					complete();
					this.fileCreated(file, libs, true, done, clibs, success);
				});

				this.webdev.insertFile(title, data, fileCreated, error, false, folderId);
			}
			catch (e)
			{
				complete();
				this.handleError(e);
			}
		}
	};

	var pickFolder = App.prototype.pickFolder;
	App.prototype.pickFolder = function(mode, fn, enabled, direct, force, returnPickerValue)
	{
		if (mode == App.MODE_WEBDEV)
		{
			ensureWebdevClient(this);

			if (this.webdev != null)
			{
				this.webdev.ensureAuthorized(mxUtils.bind(this, function()
				{
					fn((returnPickerValue) ? null : null);
				}), mxUtils.bind(this, function(err)
				{
					if (err != null)
					{
						this.handleError(err);
					}
				}));
				return;
			}
		}

		return pickFolder.apply(this, arguments);
	};

	var getServiceCount = EditorUi.prototype.getServiceCount;
	EditorUi.prototype.getServiceCount = function(allowBrowser)
	{
		var count = getServiceCount.apply(this, arguments);

		if (this.webdev != null)
		{
			count++;
		}

		return count;
	};

	var menusInit = Menus.prototype.init;
	Menus.prototype.init = function()
	{
		menusInit.apply(this, arguments);
		var editorUi = this.editorUi;

		this.put('openFrom', new Menu(function(menu, parent)
		{
			ensureWebdevClient(editorUi);

			if (editorUi.isModeReady(App.MODE_WEBDEV))
			{
				menu.addItem('WebDAV...', null, function()
				{
					editorUi.pickFile(App.MODE_WEBDEV);
				}, parent);
			}

			if (editorUi.isModeReady(App.MODE_TRELLO))
			{
				menu.addItem(mxResources.get('trello') + '...', null, function()
				{
					editorUi.pickFile(App.MODE_TRELLO);
				}, parent);
			}
			else if (editorUi.isModeEnabled(App.MODE_TRELLO))
			{
				menu.addItem(mxResources.get('trello') + ' (' + mxResources.get('loading') + '...)', null, function()
				{
					// do nothing
				}, parent, null, false);
			}

			menu.addSeparator(parent);

			if (isLocalStorage && urlParams['browser'] != '0')
			{
				menu.addItem(mxResources.get('browser') + '...', null, function()
				{
					editorUi.pickFile(App.MODE_BROWSER);
				}, parent);
			}

			if (urlParams['noDevice'] != '1')
			{
				menu.addItem(mxResources.get('device') + '...', null, function()
				{
					editorUi.pickFile(App.MODE_DEVICE);
				}, parent);
			}

			if (!editorUi.isOffline())
			{
				menu.addSeparator(parent);

				menu.addItem(mxResources.get('url') + '...', null, function()
				{
					var dlg = new FilenameDialog(editorUi, '', mxResources.get('open'), function(fileUrl)
					{
						if (fileUrl != null && fileUrl.length > 0)
						{
							if (editorUi.getCurrentFile() == null)
							{
								window.location.hash = '#U' + encodeURIComponent(fileUrl);
							}
							else
							{
								window.geOpenWindow(((mxClient.IS_CHROMEAPP) ?
									'https://app.diagrams.net/' : 'https://' + location.host + '/') +
									window.location.search + '#U' + encodeURIComponent(fileUrl));
							}
						}
					}, mxResources.get('url'));
					editorUi.showDialog(dlg.container, 300, 80, true, true);
					dlg.init();
				}, parent);
			}
		}));
	};

	var SaveDialogCtor = window.SaveDialog;
	if (typeof SaveDialogCtor === 'function')
	{
		var allowedSaveModes = [App.MODE_WEBDEV, App.MODE_TRELLO, App.MODE_DEVICE,
			App.MODE_BROWSER, 'download', '_blank'];
		var blockedSaveModePattern = /^(google|onedrive|m365|dropbox|github|gitlab)(-|$)/;

		SaveDialog = window.SaveDialog = function(editorUi, title, saveFn, disabledModes, data, mimeType,
			base64Encoded, defaultMode, folderPickerMode, enabledModes, saveBtnLabel)
		{
			if (folderPickerMode == null)
			{
				ensureWebdevClient(editorUi);
			}

			if (folderPickerMode == null && editorUi.webdev != null)
			{
				if (isBlockedMode(defaultMode))
				{
					defaultMode = App.MODE_WEBDEV;
				}

				if (SaveDialog.lastValue != null && blockedSaveModePattern.test(SaveDialog.lastValue))
				{
					SaveDialog.lastValue = App.MODE_WEBDEV;
				}

				if (enabledModes == null)
				{
					enabledModes = allowedSaveModes.slice();
				}
			}

			SaveDialogCtor.call(this, editorUi, title, saveFn, disabledModes, data, mimeType,
				base64Encoded, defaultMode, folderPickerMode, enabledModes, saveBtnLabel);

				if (this.container != null)
				{
					var selects = this.container.getElementsByTagName('select');
					for (var i = 0; i < selects.length; i++)
					{
						patchServiceSelect(editorUi, selects[i], folderPickerMode == null);
					}

					patchSaveButton(this.container, getServiceSelect(this.container),
						this.container.getElementsByTagName('input')[0], saveFn);
				}
		};

		SaveDialog.prototype = SaveDialogCtor.prototype;
		SaveDialog.lastValue = SaveDialogCtor.lastValue;
	}

	var CreateDialogCtor = window.CreateDialog;
	if (typeof CreateDialogCtor === 'function')
	{
		CreateDialog = window.CreateDialog = function(editorUi, title, createFn, cancelFn, dlgTitle,
			btnLabel, overrideExtension, allowBrowser, allowTab, helpLink, showDeviceButton,
			rowLimit, data, mimeType, base64Encoded, hints, hideDialog)
		{
			var actualHideDialog = (hideDialog != null) ? hideDialog : true;
			ensureWebdevClient(editorUi);
			var wrappedCreateFn = function(filename, mode, nameInput)
			{
				if (isBlockedMode(mode) && editorUi.webdev != null)
				{
					mode = App.MODE_WEBDEV;
				}

				createFn(filename, mode, nameInput);
			};

			CreateDialogCtor.call(this, editorUi, title, wrappedCreateFn, cancelFn, dlgTitle,
				btnLabel, overrideExtension, allowBrowser, allowTab, helpLink, showDeviceButton,
				rowLimit, data, mimeType, base64Encoded, hints, actualHideDialog);

			if (this.container != null)
			{
				var selects = this.container.getElementsByTagName('select');
				for (var i = 0; i < selects.length; i++)
				{
					patchServiceSelect(editorUi, selects[i], true);
				}

				patchCreateButtons(editorUi, this.container, wrappedCreateFn, actualHideDialog);
			}
		};

		CreateDialog.prototype = CreateDialogCtor.prototype;
		CreateDialog.showDownloadButton = CreateDialogCtor.showDownloadButton;
	}
})();
