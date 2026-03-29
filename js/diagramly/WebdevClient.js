WebdevClient = function(editorUi)
{
	DrawioClient.call(this, editorUi, 'webdevAuth');

	this.ui = editorUi;
	this.setUser((this.getConfig() != null) ? this.createUser(this.getConfig()) : null);
};

mxUtils.extend(WebdevClient, DrawioClient);

WebdevClient.prototype.extension = '.drawio';
WebdevClient.prototype.configKey = '.webdevConfig';
WebdevClient.prototype.maxFileSize = 10000000;

WebdevClient.prototype.getConfig = function()
{
	if (!isLocalStorage)
	{
		return null;
	}

	try
	{
		var value = localStorage.getItem(this.configKey);
		return (value != null) ? JSON.parse(value) : null;
	}
	catch (e)
	{
		return null;
	}
};

WebdevClient.prototype.setConfig = function(config)
{
	if (isLocalStorage)
	{
		if (config != null)
		{
			localStorage.setItem(this.configKey, JSON.stringify(config));
		}
		else
		{
			localStorage.removeItem(this.configKey);
		}
	}

	this.setUser((config != null) ? this.createUser(config) : null);
};

WebdevClient.prototype.createUser = function(config)
{
	var url = this.normalizeUrl((config != null) ? config.url : '');
	var username = (config != null) ? config.username : '';
	var displayName = username || url || 'WebDAV';

	return new DrawioUser(displayName, username, displayName);
};

WebdevClient.prototype.normalizeUrl = function(url)
{
	url = mxUtils.trim(url || '');

	if (url.length > 0 && url.charAt(url.length - 1) == '/')
	{
		url = url.substring(0, url.length - 1);
	}

	return url;
};

WebdevClient.prototype.getFileUrl = function(path)
{
	var config = this.getConfig();
	return (config != null) ? this.normalizeUrl(config.url) + this.normalizePath(path, config) : null;
};

WebdevClient.prototype.getBasePath = function(config)
{
	config = (config != null) ? config : this.getConfig();

	if (config == null || config.url == null)
	{
		return '';
	}

	try
	{
		var url = new URL(this.normalizeUrl(config.url), window.location.href);
		return (url.pathname != null && url.pathname.length > 0) ? url.pathname : '';
	}
	catch (e)
	{
		return '';
	}
};

WebdevClient.prototype.normalizePath = function(path, config)
{
	config = (config != null) ? config : this.getConfig();
	path = this.decodePath(path || '');

	if (config != null)
	{
		var url = this.normalizeUrl(config.url);
		var basePath = this.getBasePath(config);

		if (path.indexOf(url) == 0)
		{
			path = path.substring(url.length);
		}
		else
		{
			try
			{
				var parsed = new URL(path, window.location.href);
				path = parsed.pathname;
			}
			catch (e)
			{
				// ignore
			}
		}

		if (basePath.length > 0 && path.indexOf(basePath) == 0)
		{
			path = path.substring(basePath.length);
		}
	}

	if (path.length == 0)
	{
		return '/';
	}

	return (path.charAt(0) == '/') ? path : '/' + path;
};

WebdevClient.prototype.getAuthHeader = function(config)
{
	return 'Basic ' + btoa(unescape(encodeURIComponent(config.username + ':' + config.password)));
};

WebdevClient.prototype.request = function(method, path, body, success, error, headers, responseType, config)
{
	config = (config != null) ? config : this.getConfig();

	if (config == null)
	{
		if (error != null)
		{
			error({message: 'Not authorized'});
		}

		return;
	}

	var requestPath = this.normalizePath(path, config);
	var req = new mxXmlRequest(this.normalizeUrl(config.url) + requestPath, body, method);
	var auth = this.getAuthHeader(config);
	var allHeaders = headers || {};

	req.setRequestHeaders = function(request)
	{
		request.setRequestHeader('Authorization', auth);

		for (var key in allHeaders)
		{
			request.setRequestHeader(key, allHeaders[key]);
		}
	};

	req.send(mxUtils.bind(this, function()
	{
		var status = req.getStatus();

		if (status >= 200 && status <= 299)
		{
			if (success != null)
			{
				success(req);
			}
		}
		else if (status == 401 || status == 403)
		{
			this.showConfigDialog(null, true);
		}
		else if (error != null)
		{
			error({status: status, message: req.getText()});
		}
	}), mxUtils.bind(this, function(resp)
	{
		if (error != null)
		{
			error(resp);
		}
	}));
};

WebdevClient.prototype.validateConfig = function(config, success, error)
{
	this.request('PROPFIND', '/', null, mxUtils.bind(this, function(req)
	{
		if (success != null)
		{
			success(req);
		}
	}), error, {
		Depth: '0',
		'Content-Type': 'application/xml; charset=UTF-8'
	}, null, config);
};

WebdevClient.prototype.ensureAuthorized = function(success, error, force)
{
	var config = (!force) ? this.getConfig() : null;

	if (config != null)
	{
		this.validateConfig(config, success, mxUtils.bind(this, function(err)
		{
			this.showConfigDialog(error, true);
		}));
	}
	else
	{
		this.showConfigDialog(error, force);
	}
};

WebdevClient.prototype.showConfigDialog = function(error, clearExisting)
{
	if (clearExisting)
	{
		this.setConfig(null);
	}

	var config = this.getConfig() || {url: '', username: '', password: ''};
	var div = document.createElement('div');
	div.style.whiteSpace = 'normal';
	div.style.width = '360px';

	var addField = function(label, type, value)
	{
		var wrapper = document.createElement('div');
		wrapper.style.marginBottom = '12px';
		var title = document.createElement('div');
		title.style.marginBottom = '6px';
		mxUtils.write(title, label);
		wrapper.appendChild(title);
		var input = document.createElement('input');
		input.setAttribute('type', type);
		input.value = value || '';
		input.style.width = '100%';
		input.style.boxSizing = 'border-box';
		input.style.padding = '6px';
		wrapper.appendChild(input);
		div.appendChild(wrapper);
		return input;
	};

	var urlInput = addField('WebDAV URL', 'text', config.url);
	var userInput = addField(mxResources.get('username'), 'text', config.username);
	var passInput = addField(mxResources.get('password'), 'password', config.password);
	var hint = document.createElement('div');
	hint.style.color = 'gray';
	hint.style.fontSize = '11px';
	mxUtils.write(hint, 'Configuration is cached locally on this device.');
	div.appendChild(hint);

	var dlg = new CustomDialog(this.ui, div, mxUtils.bind(this, function()
	{
		var nextConfig = {
			url: this.normalizeUrl(urlInput.value),
			username: mxUtils.trim(userInput.value),
			password: passInput.value || ''
		};

		if (nextConfig.url.length == 0 || nextConfig.username.length == 0)
		{
			return mxResources.get('invalidName');
		}

		this.ui.spinner.spin(document.body, mxResources.get('authorizing'));
		this.validateConfig(nextConfig, mxUtils.bind(this, function()
		{
			this.ui.spinner.stop();
			this.setConfig(nextConfig);
			this.ui.hideDialog();
			this.showFileDialog();
		}), mxUtils.bind(this, function(err)
		{
			this.ui.spinner.stop();
			this.ui.handleError(err, mxResources.get('accessDenied'));
		}));
		return false;
	}), null, mxResources.get('login'), null, null, false, null, true);

	this.ui.showDialog(dlg.container, 420, 260, true, true);
	urlInput.focus();
};

WebdevClient.prototype.pickFile = function(fn)
{
	this.pickFileCallback = fn;
	this.ensureAuthorized(mxUtils.bind(this, function()
	{
		this.showFileDialog(fn);
	}), null);
};

WebdevClient.prototype.pickLibrary = function(fn)
{
	this.pickFile(fn);
};

WebdevClient.prototype.createXmlParser = function(text)
{
	try
	{
		return mxUtils.parseXml(text);
	}
	catch (e)
	{
		return null;
	}
};

WebdevClient.prototype.getChildByName = function(node, name)
{
	if (node == null || node.childNodes == null)
	{
		return null;
	}

	for (var i = 0; i < node.childNodes.length; i++)
	{
		var child = node.childNodes[i];

		if (child != null && child.nodeType == mxConstants.NODETYPE_ELEMENT)
		{
			var localName = child.localName || child.baseName || child.nodeName;

			if (localName == name || child.nodeName == name || /(^|:)/.test(child.nodeName) && child.nodeName.replace(/^.*:/, '') == name)
			{
				return child;
			}
		}
	}

	return null;
};

WebdevClient.prototype.getChildrenByName = function(node, name)
{
	var result = [];

	if (node == null || node.childNodes == null)
	{
		return result;
	}

	for (var i = 0; i < node.childNodes.length; i++)
	{
		var child = node.childNodes[i];

		if (child != null && child.nodeType == mxConstants.NODETYPE_ELEMENT)
		{
			var localName = child.localName || child.baseName || child.nodeName;

			if (localName == name || child.nodeName == name || /(^|:)/.test(child.nodeName) && child.nodeName.replace(/^.*:/, '') == name)
			{
				result.push(child);
			}
		}
	}

	return result;
};

WebdevClient.prototype.decodePath = function(value)
{
	try
	{
		return decodeURIComponent(value);
	}
	catch (e)
	{
		return value;
	}
};

WebdevClient.prototype.extractList = function(text)
{
	var doc = this.createXmlParser(text);
	var items = [];

	if (doc == null || doc.documentElement == null)
	{
		return items;
	}

	var responses = this.getChildrenByName(doc.documentElement, 'response');
	var rootPath = null;

	for (var i = 0; i < responses.length; i++)
	{
		var response = responses[i];
		var hrefNode = this.getChildByName(response, 'href');
		var href = (hrefNode != null) ? this.normalizePath(mxUtils.getTextContent(hrefNode) || '') : '/';
		var propstats = this.getChildrenByName(response, 'propstat');
		var prop = this.getChildByName(response, 'prop');

		if (prop == null)
		{
			for (var j = 0; j < propstats.length && prop == null; j++)
			{
				var statusNode = this.getChildByName(propstats[j], 'status');
				var statusText = (statusNode != null) ? mxUtils.getTextContent(statusNode) : '';

				if (statusText.length == 0 || statusText.indexOf(' 200 ') > 0 || / 2\d\d /.test(statusText))
				{
					prop = this.getChildByName(propstats[j], 'prop');
				}
			}
		}

		var collection = (prop != null) ? this.getChildByName(this.getChildByName(prop, 'resourcetype'), 'collection') : null;
		var path = href;
		var name = this.decodePath(path.split('/').filter(function(part)
		{
			return part.length > 0;
		}).pop() || '/');
		var modifiedNode = (prop != null) ? this.getChildByName(prop, 'getlastmodified') : null;
		var sizeNode = (prop != null) ? this.getChildByName(prop, 'getcontentlength') : null;
		var etagNode = (prop != null) ? this.getChildByName(prop, 'getetag') : null;
		var contentTypeNode = (prop != null) ? this.getChildByName(prop, 'getcontenttype') : null;
		var isDirectory = collection != null || /\/$/.test(path);

		if (rootPath == null)
		{
			rootPath = path;
		}

		if (path == rootPath)
		{
			continue;
		}

		if (!isDirectory && /\.drawio$/i.test(name))
		{
			items.push({
				path: path,
				name: name,
				etag: (etagNode != null) ? mxUtils.getTextContent(etagNode) : null,
				lastModified: (modifiedNode != null) ? mxUtils.getTextContent(modifiedNode) : null,
				size: parseInt((sizeNode != null) ? mxUtils.getTextContent(sizeNode) : '0'),
				contentType: (contentTypeNode != null) ? mxUtils.getTextContent(contentTypeNode) : null
			});
		}
	}

	items.sort(function(a, b)
	{
		return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
	});

	return items;
};

WebdevClient.prototype.listFiles = function(success, error)
{
	var body = '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getlastmodified/><d:getcontentlength/><d:getetag/><d:getcontenttype/><d:resourcetype/></d:prop></d:propfind>';
	this.request('PROPFIND', '/', body, mxUtils.bind(this, function(req)
	{
		success(this.extractList(req.getText()));
	}), error, {
		Depth: '1',
		'Content-Type': 'application/xml; charset=UTF-8'
	});
};

WebdevClient.prototype.getExposedHeader = function(request, name)
{
	if (request == null || request.getAllResponseHeaders == null)
	{
		return null;
	}

	var headers = request.getAllResponseHeaders();

	if (headers == null || headers.length == 0)
	{
		return null;
	}

	var lines = headers.split(/\r?\n/);
	var lookup = name.toLowerCase();

	for (var i = 0; i < lines.length; i++)
	{
		var idx = lines[i].indexOf(':');

		if (idx > 0 && mxUtils.trim(lines[i].substring(0, idx)).toLowerCase() == lookup)
		{
			return mxUtils.trim(lines[i].substring(idx + 1));
		}
	}

	return null;
};

WebdevClient.prototype.getFile = function(path, success, error)
{
	this.request('GET', path, null, mxUtils.bind(this, function(req)
	{
		var etag = this.getExposedHeader(req.request, 'ETag');
		var lastModified = this.getExposedHeader(req.request, 'Last-Modified');
		var meta = {
			path: path,
			name: path.split('/').pop(),
			etag: etag,
			lastModified: lastModified
		};
		success(new WebdevFile(this.ui, req.getText(), meta));
	}), error);
};

WebdevClient.prototype.doSaveFile = function(file, success, error)
{
	this.request('PUT', file.getId(), file.getData(), mxUtils.bind(this, function(req)
	{
		var meta = mxUtils.clone(file.meta);
		meta.etag = this.getExposedHeader(req.request, 'ETag') || meta.etag;
		meta.lastModified = this.getExposedHeader(req.request, 'Last-Modified') || meta.lastModified;
		success(meta);
	}), error, {
		'Content-Type': 'application/xml; charset=UTF-8'
	});
};

WebdevClient.prototype.saveFile = function(file, success, error)
{
	this.ensureAuthorized(mxUtils.bind(this, function()
	{
		this.doSaveFile(file, success, error);
	}), error);
};

WebdevClient.prototype.insertFile = function(title, data, success, error)
{
	this.ensureAuthorized(mxUtils.bind(this, function()
	{
		var path = this.normalizePath('/' + encodeURIComponent(title));
		var file = new WebdevFile(this.ui, data, {path: path, name: title});
		this.doSaveFile(file, mxUtils.bind(this, function(meta)
		{
			file.meta = meta;
			success(file);
		}), error);
	}), error);
};

WebdevClient.prototype.renameFile = function(file, title, success, error)
{
	var index = file.getId().lastIndexOf('/');
	var basePath = (index >= 0) ? file.getId().substring(0, index + 1) : '/';
	var target = this.normalizePath(basePath + encodeURIComponent(title));
	this.request('MOVE', file.getId(), null, mxUtils.bind(this, function(req)
	{
		success({
			path: target,
			name: title,
			etag: this.getExposedHeader(req.request, 'ETag') || file.meta.etag,
			lastModified: this.getExposedHeader(req.request, 'Last-Modified') || file.meta.lastModified
		});
	}), error, {
		'Destination': this.normalizeUrl(this.getConfig().url) + target,
		'Overwrite': 'T'
	});
};

WebdevClient.prototype.deleteFile = function(path, success, error)
{
	this.request('DELETE', path, null, mxUtils.bind(this, function()
	{
		if (success != null)
		{
			success();
		}
	}), error);
};

WebdevClient.prototype.filterFiles = function(files, query)
{
	query = mxUtils.trim(query || '').toLowerCase();

	if (query.length == 0)
	{
		return files.slice();
	}

	var matches = [];

	for (var i = 0; i < files.length; i++)
	{
		var name = (files[i].name || '').toLowerCase();
		var score = 0;
		var lastIndex = -1;
		var startIndex = -1;
		var contiguous = 0;
		var matched = true;

		for (var j = 0; j < query.length; j++)
		{
			var index = name.indexOf(query.charAt(j), lastIndex + 1);

			if (index < 0)
			{
				matched = false;
				break;
			}

			if (startIndex < 0)
			{
				startIndex = index;
			}

			if (index == lastIndex + 1)
			{
				contiguous++;
				score += 3;
			}
			else
			{
				score += 1;
			}

			lastIndex = index;
		}

		if (matched)
		{
			score += Math.max(0, 20 - startIndex);
			score += contiguous * 2;
			matches.push({file: files[i], score: score});
		}
	}

	matches.sort(function(a, b)
	{
		if (b.score != a.score)
		{
			return b.score - a.score;
		}

		return a.file.name.toLowerCase().localeCompare(b.file.name.toLowerCase());
	});

	var result = [];

	for (var i = 0; i < matches.length; i++)
	{
		result.push(matches[i].file);
	}

	return result;
};

WebdevClient.prototype.showFileDialog = function(fn)
{
	fn = (fn != null) ? fn : this.pickFileCallback;
	var content = document.createElement('div');
	content.style.width = '680px';
	content.style.overflow = 'hidden';

	var title = document.createElement('h3');
	title.style.margin = '0 0 12px 0';
	mxUtils.write(title, 'WebDAV');
	content.appendChild(title);

	var searchWrapper = document.createElement('div');
	searchWrapper.style.marginBottom = '12px';
	searchWrapper.style.display = 'flex';
	searchWrapper.style.alignItems = 'center';
	content.appendChild(searchWrapper);

	var searchInput = document.createElement('input');
	searchInput.setAttribute('type', 'text');
	searchInput.setAttribute('placeholder', 'Search files');
	searchInput.style.width = '100%';
	searchInput.style.boxSizing = 'border-box';
	searchInput.style.padding = '6px';
	searchInput.style.flex = '1';
	searchWrapper.appendChild(searchInput);

	var listContainer = document.createElement('div');
	listContainer.style.height = '344px';
	listContainer.style.overflow = 'auto';
	listContainer.style.border = '1px solid lightgray';
	content.appendChild(listContainer);

	var footer = document.createElement('div');
	footer.style.marginTop = '12px';
	footer.style.display = 'flex';
	footer.style.alignItems = 'center';
	content.appendChild(footer);

	var createBtn = mxUtils.button('Create new file', mxUtils.bind(this, function()
	{
		var defaultName = this.ui.defaultFilename;
		if (!/\.[^./]+$/.test(defaultName))
		{
			defaultName += this.extension;
		}
		var dlg2 = new FilenameDialog(this.ui, defaultName, mxResources.get('create'), mxUtils.bind(this, function(name)
		{
			if (name != null && name.length > 0)
			{
				this.ui.hideDialog();
				this.ui.createFile(name, null, null, App.MODE_WEBDEV);
			}
		}), mxResources.get('diagramName'));
		this.ui.showDialog(dlg2.container, 340, 100, true, true);
		dlg2.init();
	}));
	createBtn.className = 'geBtn gePrimaryBtn';
	footer.appendChild(createBtn);

	var logoutText = (mxResources.get('logout') != null) ? mxResources.get('logout') : 'Logout';
	var logoutBtn = mxUtils.button(logoutText, mxUtils.bind(this, function()
	{
		this.setConfig(null);
		this.ui.hideDialog();
		this.showConfigDialog();
	}));
	logoutBtn.className = 'geBtn';
	logoutBtn.style.marginLeft = '8px';
	logoutBtn.style.paddingTop = '4px';
	logoutBtn.style.paddingBottom = '4px';
	logoutBtn.style.lineHeight = '18px';
	logoutBtn.style.backgroundColor = '#d9534f';
	logoutBtn.style.borderColor = '#d43f3a';
	logoutBtn.style.color = '#ffffff';
	footer.appendChild(logoutBtn);

	var dlg = new CustomDialog(this.ui, content, null, null, null, null, null, true, null, true, null, '0px');
	searchWrapper.appendChild(dlg.okButton);
	dlg.okButton.style.marginLeft = '8px';
	this.ui.showDialog(dlg.container, 720, 470, true, true);

	var allFiles = [];
	var refreshList = mxUtils.bind(this, function()
	{
		render(this.filterFiles(allFiles, searchInput.value));
	});

	var render = mxUtils.bind(this, function(files)
	{
		listContainer.innerText = '';

		if (files.length == 0)
		{
			var empty = document.createElement('div');
			empty.style.padding = '12px';
			empty.style.color = 'gray';
			mxUtils.write(empty, (mxUtils.trim(searchInput.value || '').length > 0) ? 'No matching files' : mxResources.get('noFiles'));
			listContainer.appendChild(empty);
			return;
		}

		var table = document.createElement('table');
		table.style.width = '100%';
		table.style.borderCollapse = 'collapse';
		listContainer.appendChild(table);

		for (var i = 0; i < files.length; i++)
		{
			(function(file)
			{
				var row = document.createElement('tr');
				row.style.borderBottom = '1px solid #eee';
				table.appendChild(row);

				var nameTd = document.createElement('td');
				nameTd.style.padding = '8px';
				row.appendChild(nameTd);

				var link = document.createElement('a');
				link.style.cursor = 'pointer';
				mxUtils.write(link, file.name);
				nameTd.appendChild(link);

				var metaTd = document.createElement('td');
				metaTd.style.padding = '8px';
				metaTd.style.width = '180px';
				metaTd.style.color = 'gray';
				mxUtils.write(metaTd, file.lastModified || '');
				row.appendChild(metaTd);

				var actionTd = document.createElement('td');
				actionTd.style.padding = '8px';
				actionTd.style.textAlign = 'right';
				row.appendChild(actionTd);

				var renameBtn = mxUtils.button(mxResources.get('rename'), mxUtils.bind(this, function()
				{
					var renameDlg = new FilenameDialog(this.ui, file.name, mxResources.get('rename'), mxUtils.bind(this, function(newName)
					{
						if (newName != null && newName.length > 0 && newName != file.name)
						{
							this.ui.hideDialog();
							this.renameFile({getId: function(){ return file.path; }, meta: file}, newName, mxUtils.bind(this, function()
							{
								this.showFileDialog(fn);
							}), mxUtils.bind(this, function(err)
							{
								this.ui.handleError(err, mxResources.get('errorRenamingFile'));
							}));
						}
					}), mxResources.get('diagramName'));
					this.ui.showDialog(renameDlg.container, 340, 100, true, true);
					renameDlg.init();
				}));
				renameBtn.className = 'geBtn';
					renameBtn.style.backgroundColor = '#f0ad4e';
					renameBtn.style.borderColor = '#eea236';
					renameBtn.style.color = '#ffffff';
				actionTd.appendChild(renameBtn);

				var deleteBtn = mxUtils.button(mxResources.get('delete'), mxUtils.bind(this, function()
				{
					if (mxUtils.confirm(mxResources.get('delete') + ' "' + file.name + '"?'))
					{
						this.deleteFile(file.path, mxUtils.bind(this, function()
						{
							this.showFileDialog(fn);
						}), mxUtils.bind(this, function(err)
						{
							this.ui.handleError(err, mxResources.get('errorDeletingFile'));
						}));
					}
				}));
				deleteBtn.className = 'geBtn';
				deleteBtn.style.marginLeft = '8px';
					deleteBtn.style.backgroundColor = '#d9534f';
					deleteBtn.style.borderColor = '#d43f3a';
					deleteBtn.style.color = '#ffffff';
				actionTd.appendChild(deleteBtn);

				mxEvent.addListener(link, 'click', mxUtils.bind(this, function()
				{
					this.getFile(file.path, mxUtils.bind(this, function(webdevFile)
					{
						var openFile = mxUtils.bind(this, function()
						{
							this.ui.hideDialog();
							if (fn != null)
							{
								fn(webdevFile.getId());
							}
							else
							{
								this.ui.fileLoaded(webdevFile);
							}
						});

						var currentFile = this.ui.getCurrentFile();

						if (currentFile == null || !currentFile.isModified())
						{
							openFile();
						}
						else
						{
							this.ui.confirm(mxResources.get('allChangesLost'), null, openFile,
								mxResources.get('cancel'), mxResources.get('discardChanges'));
						}
					}), mxUtils.bind(this, function(err)
					{
						this.ui.handleError(err, mxResources.get('errorLoadingFile'));
					}));
				}));
			}).apply(this, [files[i]]);
		}
	});

	this.ui.spinner.spin(listContainer, mxResources.get('loading'));
	mxEvent.addListener(searchInput, 'input', refreshList);
	this.listFiles(mxUtils.bind(this, function(files)
	{
		this.ui.spinner.stop();
		allFiles = files;
		refreshList();
	}), mxUtils.bind(this, function(err)
	{
		this.ui.spinner.stop();
		this.ui.handleError(err, mxResources.get('errorLoadingFile'));
	}));
	searchInput.focus();
};
