
<?php if(!empty($settings->enable_socialbuttons)){
	  if(!empty($settings->show_sharebutton_on)){	  	
	  if($settings->show_sharebutton_on == 'front' || $settings->show_sharebutton_on == 'both'){ ?>
	
	  		<?php
	  		$ref_link = seed_cspv5_ref_link();
	  		?>
			<?php if((isset($settings->share_buttons->facebook) && $settings->share_buttons->facebook == '1') || (isset($settings->share_buttons->facebook_send) && $settings->share_buttons->facebook_send == '1') ) { ?>
				<div id="fb-root"></div>
				<script>(function(d, s, id) {
				  var js, fjs = d.getElementsByTagName(s)[0];
				  if (d.getElementById(id)) return;
				  js = d.createElement(s); js.id = id;
				  js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.4";
				  fjs.parentNode.insertBefore(js, fjs);
				}(document, 'script', 'facebook-jssdk'));</script>
				<?php } ?>
			<ul id="cspio-sharebuttons">

				<?php if(isset($settings->share_buttons->twitter) && $settings->share_buttons->twitter == '1'){ ?>
					<li id="share_twitter">
					<a id="twitter-tweet-btn" class="twitter-share-button" data-url="<?php echo $ref_link; ?>" data-text="<?php echo $settings->tweet_text; ?>" data-count="none">Tweet</a>
				<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>
					</li>
				<?php } ?>

				<?php if(isset($settings->share_buttons->facebook) && $settings->share_buttons->facebook == '1'){ ?>
				<li id="share_facebook"><div class="fb-share-button" data-href="<?php echo $ref_link; ?>"  data-type="button"></div></li>
				<?php } ?>

				<?php if(isset($settings->share_buttons->facebook_send) && $settings->share_buttons->facebook_send == '1'){ ?>
				<li id="share_facebook_send"><div class="fb-send" data-href="<?php echo $ref_link; ?>"  data-layout="button_count"></div></li>
				<?php } ?>

				<?php if(isset($settings->share_buttons->googleplus) && $settings->share_buttons->googleplus == '1'){ ?>
				<li id="share_googleplus"><div class="g-plusone" data-size="medium" data-annotation="none" data-href="<?php echo $ref_link; ?>"></div>
				<script type="text/javascript">
				  (function() {
				    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
				    po.src = 'https://apis.google.com/js/platform.js';
				    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
				  })();
				</script></li>
				<?php } ?>

				<?php if(isset($settings->share_buttons->linkedin) && $settings->share_buttons->linkedin == '1'){ ?>
					<li id="share_linkedin"><script src="//platform.linkedin.com/in.js" type="text/javascript"></script>
					<script type="IN/Share" data-url="<?php echo $ref_link; ?>"></script></li>
				<?php } ?>

				<?php if(isset($settings->share_buttons->pinterest) && $settings->share_buttons->pinterest == '1'){ ?>
					<li id="share_pinterest"><a href="http://pinterest.com/pin/create/button/?url=<?php echo urlencode($ref_link); ?>&media=<?php echo $settings->pinterest_thumbnail; ?>&description=<?php echo $settings->seo_description; ?>" class="pin-it-button" >
					<img border="0" src="//assets.pinterest.com/images/PinExt.png" title="Pin It" /></a>
					<script type="text/javascript" src="//assets.pinterest.com/js/pinit.js"></script></li>
				<?php } ?>

				<?php if(isset($settings->share_buttons->tumblr) && $settings->share_buttons->tumblr == '1'){ ?>
					<li id="share_tumblr">
					<a href="http://www.tumblr.com/share/link?url=<?php echo urlencode($ref_link); ?>" title="Share on Tumblr" style="display:inline-block; text-indent:-9999px; overflow:hidden; width:81px; height:20px; background:url('//platform.tumblr.com/v1/share_1.png') top left no-repeat transparent;">Share on Tumblr</a><script type="text/javascript" src="//platform.tumblr.com/v1/share.js"></script></li>
				<?php } ?>

			</ul>
		
<?php }}} ?>
