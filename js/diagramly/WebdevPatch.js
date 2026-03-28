(function()
{
	App.MODE_WEBDEV = 'webdev';

	var appInit = App.prototype.init;
	App.prototype.init = function()
	{
		appInit.apply(this, arguments);

		if (this.webdev == null)
		{
			try
			{
				this.webdev = new WebdevClient(this);
				this.webdev.addListener('userChanged', mxUtils.bind(this, function()
				{
					this.updateButtonContainer();
					this.restoreLibraries();
				}));
				this.fireEvent(new mxEventObject('clientLoaded', 'client', this.webdev));
			}
			catch (e)
			{
				if (window.console != null)
				{
					console.log('WebdevClient disabled: ' + e.message);
				}
			}
		}
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

			if (sameWindow == null && currentFile != null && currentFile.isModified())
			{
				fn();
			}
			else
			{
				fn();
			}

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
})();
