WebdevFile = function(ui, data, meta)
{
	DrawioFile.call(this, ui, data);

	this.meta = meta;
	this.peer = this.ui.webdev;
};

mxUtils.extend(WebdevFile, DrawioFile);

WebdevFile.prototype.getMode = function()
{
	return App.MODE_WEBDEV;
};

WebdevFile.prototype.getId = function()
{
	return this.meta.path;
};

WebdevFile.prototype.getHash = function()
{
	return 'W' + encodeURIComponent(this.getId());
};

WebdevFile.prototype.getTitle = function()
{
	return this.meta.name;
};

WebdevFile.prototype.getFileUrl = function()
{
	return (this.peer != null) ? this.peer.getFileUrl(this.getId()) : null;
};

WebdevFile.prototype.isAutosaveOptional = function()
{
	return true;
};

WebdevFile.prototype.isRenamable = function()
{
	return true;
};

WebdevFile.prototype.getLatestVersion = function(success, error)
{
	this.peer.getFile(this.getId(), success, error);
};

WebdevFile.prototype.getDescriptor = function()
{
	return this.meta;
};

WebdevFile.prototype.setDescriptor = function(desc)
{
	this.meta = desc;
};

WebdevFile.prototype.getDescriptorEtag = function(desc)
{
	return (desc != null) ? (desc.etag || desc.path || desc.lastModified || desc.name) : null;
};

WebdevFile.prototype.setDescriptorEtag = function(desc, etag)
{
	if (desc != null)
	{
		desc.etag = etag;
	}
};

WebdevFile.prototype.save = function(revision, success, error, unloading, overwrite)
{
	this.doSave(this.getTitle(), success, error, unloading, overwrite);
};

WebdevFile.prototype.saveAs = function(title, success, error)
{
	this.doSave(title, success, error);
};

WebdevFile.prototype.doSave = function(title, success, error, unloading, overwrite)
{
	var prev = this.meta.name;
	this.meta.name = title;

	DrawioFile.prototype.save.apply(this, [null, mxUtils.bind(this, function()
	{
		this.meta.name = prev;
		this.saveFile(title, false, success, error, unloading, overwrite);
	}), error, unloading, overwrite]);
};

WebdevFile.prototype.saveFile = function(title, revision, success, error, unloading, overwrite)
{
	if (!this.isEditable())
	{
		if (success != null)
		{
			success();
		}
	}
	else if (!this.savingFile)
	{
		if (this.getTitle() == title)
		{
			try
			{
				this.savingFileTime = new Date();
				this.setShadowModified(false);
				this.savingFile = true;

				var savedEtag = this.getDescriptorEtag(this.meta);
				var savedData = this.data;

				this.peer.saveFile(this, mxUtils.bind(this, function(meta)
				{
					this.setModified(this.getShadowModified());
					this.savingFile = false;
					this.meta = meta;
					this.fileSaved(savedData, savedEtag, mxUtils.bind(this, function()
					{
						this.contentChanged();

						if (success != null)
						{
							success();
						}
					}), error);
				}), mxUtils.bind(this, function(err)
				{
					this.savingFile = false;

					if (error != null)
					{
						error(err);
					}
				}));
			}
			catch (e)
			{
				this.savingFile = false;

				if (error != null)
				{
					error(e);
				}
				else
				{
					throw e;
				}
			}
		}
		else
		{
			this.savingFileTime = new Date();
			this.setShadowModified(false);
			this.savingFile = true;

			this.peer.insertFile(title, this.getData(), mxUtils.bind(this, function(file)
			{
				this.setModified(this.getShadowModified());
				this.savingFile = false;

				if (success != null)
				{
					success();
				}

				this.ui.fileLoaded(file);
			}), mxUtils.bind(this, function(err)
			{
				this.savingFile = false;

				if (error != null)
				{
					error(err);
				}
			}));
		}
	}
	else if (error != null)
	{
		error({code: App.ERROR_BUSY});
	}
};

WebdevFile.prototype.rename = function(title, success, error)
{
	var oldTitle = this.getTitle();

	this.peer.renameFile(this, title, mxUtils.bind(this, function(meta)
	{
		this.meta = meta;
		this.descriptorChanged();

		if (!this.hasSameExtension(title, oldTitle))
		{
			this.save(true, success, error);
		}
		else if (success != null)
		{
			success(meta);
		}
	}), error);
};
